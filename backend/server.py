import hashlib
import hmac
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import razorpay
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user
    from backend.seed import sample_creator_docs
    from backend import locations as geo
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user
    from seed import sample_creator_docs
    import locations as geo

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("hiremyface")

DEFAULT_PRICING = {"pro_price": 999, "pro_days": 30, "fee_pct": 10, "free_contacts": 3}
CLOSED_DEALS = ("declined", "cancelled", "completed", "refunded")
PLANS = ("per_video", "part_time", "full_time")
PlanT = Literal["per_video", "part_time", "full_time"]
PAID_STATES = ("paid", "delivered", "completed", "disputed", "refunded")


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso() -> str:
    return now().isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- roles (code-defined) ----------
ROLES = ["owner", "admin", "member"]
ADMIN_ROLES = ("owner", "admin")
HIDE = {"blocked": {"$ne": True}, "removed": {"$ne": True}}
ACTIVE_DEALS = ["pending", "countered", "accepted", "paid", "delivered", "disputed"]
DEFAULT_ROLE = "member"
RETIRED_ROLES = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _clerk_user(user_id: str) -> dict:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    return r.json()


def _clerk_headers() -> dict:
    return {"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"}


def _revoke_sessions(user_id: str):
    r = requests.get("https://api.clerk.com/v1/sessions", params={"user_id": user_id, "status": "active"}, headers=_clerk_headers(), timeout=10)
    r.raise_for_status()
    data = r.json()
    for s in (data.get("data", []) if isinstance(data, dict) else data):
        requests.post(f"https://api.clerk.com/v1/sessions/{s['id']}/revoke", headers=_clerk_headers(), timeout=10)


def _profile_from_clerk(data: dict) -> dict:
    owner = os.environ.get("OWNER_EMAIL", "").strip().lower()
    emails = data.get("email_addresses") or []
    verified = [e["email_address"].lower() for e in emails if (e.get("verification") or {}).get("status") == "verified"]
    is_admin = bool(owner) and owner in verified
    primary = next((e["email_address"] for e in emails if e.get("id") == data.get("primary_email_address_id")),
                   emails[0]["email_address"] if emails else "")
    name = " ".join(x for x in [data.get("first_name"), data.get("last_name")] if x) or primary.split("@")[0]
    return {"role": "owner" if is_admin else DEFAULT_ROLE, "email": primary, "name": name, "image_url": data.get("image_url", ""),
            "verified": verified}


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        prof = _profile_from_clerk(await run_in_threadpool(_clerk_user, uid))
        verified = prof.pop("verified")
        if prof["role"] == DEFAULT_ROLE and verified and await db.admin_invites.find_one_and_delete({"email": {"$in": verified}}):
            prof["role"] = "admin"
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": prof["role"]}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "active_mode": None, "pro_until": None, "payout_upi": "",
                              "created_at": iso(), **prof}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if member.get("blocked"):
        raise HTTPException(status_code=403, detail="account_blocked")
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check


def is_pro(member: dict) -> bool:
    pu = member.get("pro_until")
    return bool(pu) and datetime.fromisoformat(pu) > now()


PREF_OF = {"offer": "offers", "message": "messages", "deal": "deals", "payment": "deals", "payout": "deals", "rating": "deals", "interest": "offers"}


async def notify(user_id: str, kind: str, text: str, link: str = ""):
    if user_id.startswith("sample_"):
        return
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "notify_prefs": 1})
    if u and (u.get("notify_prefs") or {}).get(PREF_OF.get(kind, ""), True) is False:
        return
    await db.notifications.insert_one({"id": new_id(), "user_id": user_id, "kind": kind, "text": text,
                                       "link": link, "read": False, "created_at": iso()})


# ---------- models ----------
class CreatorIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    photo: str = Field(min_length=5, max_length=900_000)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field("", max_length=60)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    categories: List[str] = Field(min_length=1, max_length=4)
    gender: Literal["Female", "Male", "Other"]
    languages: List[str] = Field(min_length=1, max_length=8)
    bio: str = Field("", max_length=500)
    intro_video: str = Field("", max_length=500)
    samples: List[str] = Field(default_factory=list, max_length=12)
    instagram: str = Field("", max_length=200)
    youtube: str = Field("", max_length=200)
    followers: int = Field(0, ge=0)
    phone: str = Field("", max_length=20)
    rate_per_video: Optional[int] = Field(None, ge=100, le=10_000_000)
    rate_part_time: Optional[int] = Field(None, ge=500, le=10_000_000)
    rate_full_time: Optional[int] = Field(None, ge=500, le=10_000_000)


class BusinessIn(BaseModel):
    company: str = Field(min_length=2, max_length=80)
    logo: str = Field("", max_length=900_000)
    industry: str = Field(min_length=2, max_length=40)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field("", max_length=60)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    website: str = Field("", max_length=200)
    phone: str = Field("", max_length=20)
    need_plans: List[PlanT] = Field(min_length=1, max_length=3)
    budget: str = Field(min_length=1, max_length=40)
    languages: List[str] = Field(default_factory=list, max_length=8)
    description: str = Field("", max_length=500)


class JobIn(BaseModel):
    title: str = Field(min_length=4, max_length=80)
    description: str = Field(min_length=10, max_length=1500)
    plans: List[PlanT] = Field(min_length=1, max_length=3)
    budget: str = Field(min_length=1, max_length=40)
    languages: List[str] = Field(default_factory=list, max_length=8)
    status: Literal["open", "paused", "closed"] = "open"


class InterestIn(BaseModel):
    note: str = Field("", max_length=500)


class InterestStatusIn(BaseModel):
    status: Literal["shortlisted", "declined", "offered"]


class VisibilityIn(BaseModel):
    kind: Literal["creator", "business"]
    live: bool


class PostsIn(BaseModel):
    posts: List[str] = Field(max_length=12)


class NotifyPrefs(BaseModel):
    offers: bool = True
    deals: bool = True
    messages: bool = True


class MeUpdate(BaseModel):
    active_mode: Optional[Literal["creator", "business"]] = None
    payout_upi: Optional[str] = Field(None, max_length=80)
    notify_prefs: Optional[NotifyPrefs] = None


class OfferIn(BaseModel):
    creator_id: str
    plan: PlanT
    brief: str = Field(min_length=10, max_length=1500)
    start_date: str = Field(min_length=8, max_length=20)
    price: int = Field(ge=100, le=10_000_000)


class DealAction(BaseModel):
    action: Literal["accept", "decline", "counter", "accept_counter", "cancel", "submit_work", "mark_delivered", "dispute"]
    price: Optional[int] = Field(None, ge=100, le=10_000_000)
    link: Optional[str] = Field(None, max_length=500)
    note: Optional[str] = Field(None, max_length=1000)


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class RatingIn(BaseModel):
    stars: int = Field(ge=1, le=5)
    review: str = Field("", max_length=500)


class OrderIn(BaseModel):
    kind: Literal["deal", "pro"]
    deal_id: Optional[str] = None


class VerifyIn(BaseModel):
    payment_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


class ReportIn(BaseModel):
    target_type: Literal["creator", "business", "job", "deal"]
    target_id: str = Field(min_length=1, max_length=80)
    reason: Literal["fake_profile", "inappropriate", "scam", "no_show", "other"]
    note: str = Field("", max_length=500)


class ReasonIn(BaseModel):
    reason: str = Field(min_length=3, max_length=300)


class CreatorReviewIn(BaseModel):
    status: Literal["approved", "rejected"]
    reason: str = Field("", max_length=300)


class PostRemoveIn(BaseModel):
    creator_id: str
    index: int = Field(ge=0, le=11)
    prefix: str = Field(max_length=80)
    reason: str = Field(min_length=3, max_length=300)


class ResolveIn(BaseModel):
    action: Literal["dismiss", "warn", "remove", "block", "release", "refund"]
    note: str = Field(min_length=3, max_length=500)


class TeamIn(BaseModel):
    email: str = Field(min_length=5, max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------- helpers ----------
def rzp_client():
    kid, sec = os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET")
    return razorpay.Client(auth=(kid, sec)) if kid and sec else None


CONTACT_RE = re.compile(
    r"([\w.+-]+@[\w-]+\.[\w.]+)|(\+?\d[\d\s().-]{7,}\d)|(https?://\S+)|(www\.\S+)|(\b[\w-]+\.(com|in|net|org|io|me|co)\b\S*)",
    re.IGNORECASE)


def _mask_one(m: re.Match) -> str:
    s = m.group(0)
    if m.group(2) and sum(ch.isdigit() for ch in s) < 10:
        return s
    return "[hidden until payment]"


def mask(text: str) -> str:
    return CONTACT_RE.sub(_mask_one, text)


def public_creator(c: dict) -> dict:
    c = {k: v for k, v in c.items() if k not in ("phone",)}
    return c


async def pricing() -> dict:
    doc = await db.settings.find_one({"_id": "pricing"}, {"_id": 0}) or {}
    return {**DEFAULT_PRICING, **doc}


async def contacts_used(uid: str) -> list:
    return await db.deals.distinct("creator_id", {"business_id": uid})


async def check_contact(member: dict, creator_id: str):
    if is_pro(member):
        return
    used = await contacts_used(member["user_id"])
    limit = (await pricing())["free_contacts"]
    if creator_id not in used and len(used) >= limit:
        raise HTTPException(402, f"Free accounts can contact up to {limit} creators. Upgrade to Business Pro to contact more.")


async def get_deal_for(deal_id: str, member: dict) -> dict:
    scope = {} if member["role"] in ADMIN_ROLES else {"$or": [{"business_id": member["user_id"]}, {"creator_id": member["user_id"]}]}
    deal = await db.deals.find_one({"id": deal_id, **scope}, {"_id": 0})
    if not deal:
        raise HTTPException(404, "Deal not found")
    return deal


async def mark_payment_done(pay: dict, gateway_payment_id: str):
    prices = await pricing()
    if pay["kind"] == "deal":
        deal = await db.deals.find_one_and_update(
            {"id": pay["deal_id"], "status": "accepted"},
            {"$set": {"status": "paid", "paid_at": iso(), "payout_status": "held", "payment_id": pay["id"], "updated_at": iso(),
                      "fee_pct": pay.get("fee_pct", prices["fee_pct"])},
             "$push": {"history": {"status": "paid", "at": iso()}}},
            projection={"_id": 0})
        if not deal:
            raise HTTPException(400, "This deal is no longer waiting for payment")
    claimed = await db.payments.update_one({"id": pay["id"], "status": {"$ne": "paid"}},
                                           {"$set": {"status": "paid", "gateway_payment_id": gateway_payment_id, "paid_at": iso()}})
    if not claimed.modified_count:
        return
    if pay["kind"] == "pro":
        user = await db.users.find_one({"user_id": pay["user_id"]}, {"_id": 0})
        base = now()
        if user and user.get("pro_until") and datetime.fromisoformat(user["pro_until"]) > base:
            base = datetime.fromisoformat(user["pro_until"])
        await db.users.update_one({"user_id": pay["user_id"]}, {"$set": {"pro_until": (base + timedelta(days=pay.get("pro_days", prices["pro_days"]))).isoformat()}})
        await notify(pay["user_id"], "payment", "Business Pro is active. Chat and in-app payments are unlocked.", "/app/profile")
    else:
        await notify(deal["creator_id"], "payment", f"Payment received and held for '{deal['plan_label']}'. Start the work!", f"/app/chat/{deal['id']}")
        await notify(deal["business_id"], "payment", "Payment successful. The money is held safely until you approve the work.", f"/app/chat/{deal['id']}")


PLAN_LABEL = {"per_video": "Per Video", "part_time": "Part-time", "full_time": "Full-time"}
RATE_FIELD = {"per_video": "rate_per_video", "part_time": "rate_part_time", "full_time": "rate_full_time"}


def with_plans(data: dict) -> dict:
    rates = [(p, data.get(RATE_FIELD[p])) for p in PLANS]
    offered = [p for p, r in rates if r]
    if not offered:
        raise HTTPException(400, "Offer at least one plan with a price")
    data["plans"] = offered
    data["category"] = data["categories"][0]
    data["from_plan"] = offered[0]
    data["from_price"] = data[RATE_FIELD[offered[0]]]
    return data


def with_geo(data: dict) -> dict:
    c = geo.lookup(data["city"], data.get("state", ""))
    lat, lng = data.pop("lat", None), data.pop("lng", None)
    if c:
        data["city"], data["state"] = c["name"], c["state"]
        if lat is None or lng is None:
            lat, lng = c["lat"], c["lng"]
    data["loc"] = {"type": "Point", "coordinates": [lng, lat]} if lat is not None and lng is not None else None
    return data


def apply_location(query: dict, state: str, city: str, lat: Optional[float], lng: Optional[float], radius_km: int):
    if lat is not None and lng is not None and radius_km > 0:
        query["loc"] = {"$geoWithin": {"$centerSphere": [[lng, lat], radius_km / 6378.1]}}
    elif city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
        if state:
            query["state"] = state
    elif state:
        query["state"] = state


def add_distance(docs: list, lat: Optional[float], lng: Optional[float], by_distance: bool) -> list:
    for d in docs:
        loc = d.pop("loc", None)
        if lat is not None and lng is not None and loc:
            d["distance_km"] = round(geo.haversine_km(lat, lng, loc["coordinates"][1], loc["coordinates"][0]), 1)
    if by_distance and lat is not None:
        docs.sort(key=lambda d: d.get("distance_km", 1e9))
    return docs


# ---------- locations ----------
@api.get("/locations/states")
async def location_states():
    counts = {}
    for c in geo.CITIES:
        counts[c["state"]] = counts.get(c["state"], 0) + 1
    return [{"state": s, "cities": counts[s]} for s in geo.STATES]


@api.get("/locations/cities")
async def location_cities(state: str, q: str = ""):
    rows = geo.cities_in(state)
    if q:
        rows = [c for c in rows if q.lower() in c["name"].lower()]
    return rows[:300]


@api.get("/locations/search")
async def location_search(q: str):
    ql = q.strip().lower()
    states = [s for s in geo.STATES if ql and ql in s.lower()][:5]
    return {"states": states, "cities": geo.search(q)}


@api.get("/locations/nearest")
async def location_nearest(lat: float, lng: float):
    return geo.nearest(lat, lng)


# ---------- public ----------
@api.get("/")
async def root():
    return {"message": "HireMyFace API"}


@api.get("/config")
async def config():
    return {"payments_mode": "razorpay" if rzp_client() else "test", "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            **await pricing()}


class TrackIn(BaseModel):
    session_id: str = Field(min_length=6, max_length=64)
    page: str = Field(min_length=1, max_length=60)


@api.post("/track")
async def track(body: TrackIn):
    await db.events.insert_one({"session_id": body.session_id, "page": body.page, "at": iso()})
    return {"ok": True}


@api.post("/creators/{creator_id}/view")
async def view_creator(creator_id: str, member: dict = Depends(current_member)):
    if creator_id == member["user_id"]:
        return {"ok": True}
    r = await db.profile_views.update_one({"creator_id": creator_id, "viewer_id": member["user_id"], "day": iso()[:10]},
                                          {"$setOnInsert": {"at": iso()}}, upsert=True)
    if r.upserted_id:
        await db.creators.update_one({"user_id": creator_id}, {"$inc": {"views": 1}})
    return {"ok": True}


@api.get("/creators")
async def list_creators(q: str = "", category: str = "", city: str = "", state: str = "", lat: Optional[float] = None,
                        lng: Optional[float] = None, radius_km: int = 0, language: str = "", plan: str = "",
                        gender: str = "", min_price: int = 0, max_price: int = 0, sort: str = "recommended", limit: int = 60):
    query = {"status": "approved", "live": {"$ne": False}, **HIDE}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"city": rx}, {"state": rx}, {"categories": rx}, {"bio": rx}]
    if category:
        query["categories"] = category
    apply_location(query, state, city, lat, lng, radius_km)
    if language:
        query["languages"] = language
    if gender:
        query["gender"] = gender
    field = RATE_FIELD.get(plan, "from_price")
    if plan in RATE_FIELD:
        query[field] = {"$ne": None}
    if min_price or max_price:
        query[field] = {**({"$gte": min_price} if min_price else {}), **({"$lte": max_price} if max_price else {})}
    order = {"price_asc": [(field, 1)], "price_desc": [(field, -1)], "newest": [("created_at", -1)],
             "rating": [("rating_avg", -1)]}.get(sort, [("rating_avg", -1), ("rating_count", -1)])
    docs = await db.creators.find(query, {"_id": 0, "phone": 0, "samples": 0}).sort(order).to_list(min(limit, 100))
    return add_distance(docs, lat, lng, sort == "nearest" or (sort == "recommended" and radius_km > 0))


@api.get("/creators/{creator_id}")
async def get_creator(creator_id: str):
    c = await db.creators.find_one({"user_id": creator_id, "status": "approved", **HIDE}, {"_id": 0, "phone": 0, "loc": 0})
    if not c:
        raise HTTPException(404, "Creator not found")
    reviews = await db.deals.find({"creator_id": creator_id, "rating": {"$ne": None}},
                                  {"_id": 0, "rating": 1, "business_name": 1, "plan_label": 1}).sort("rated_at", -1).to_list(20)
    return {**c, "reviews": reviews}


# ---------- me ----------
@api.get("/me")
async def me(member: dict = Depends(current_member)):
    uid = member["user_id"]
    creator = await db.creators.find_one({"user_id": uid}, {"_id": 0})
    business = await db.businesses.find_one({"user_id": uid}, {"_id": 0})
    unread = await db.notifications.count_documents({"user_id": uid, "read": False})
    return {"user": member, "creator": creator, "business": business, "is_pro": is_pro(member),
            "jobs_count": await db.jobs.count_documents({"business_id": uid}),
            "unread_notifications": unread, "contacts_used": len(await contacts_used(uid)),
            "free_contacts": (await pricing())["free_contacts"]}


@api.patch("/me")
async def update_me(body: MeUpdate, member: dict = Depends(current_member)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd.get("active_mode") == "creator" and not await db.creators.find_one({"user_id": member["user_id"]}):
        raise HTTPException(400, "Create your creator profile first")
    if upd.get("active_mode") == "business" and not await db.businesses.find_one({"user_id": member["user_id"]}):
        raise HTTPException(400, "Create your business profile first")
    if upd:
        await db.users.update_one({"user_id": member["user_id"]}, {"$set": upd})
    if upd.get("payout_upi"):
        async for p in db.payouts.find({"creator_id": member["user_id"], "status": "failed"}, {"_id": 0, "deal_id": 1}):
            await release_payout(p["deal_id"])
    return {"ok": True}


@api.delete("/me")
async def delete_me(member: dict = Depends(current_member)):
    uid = member["user_id"]
    for col in ("creators", "businesses", "saved", "notifications"):
        await db[col].delete_many({"user_id": uid})
    await db.jobs.delete_many({"business_id": uid})
    await db.interests.delete_many({"$or": [{"business_id": uid}, {"creator_id": uid}]})
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}


@api.put("/creators/me")
async def upsert_creator(body: CreatorIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    existing = await db.creators.find_one({"user_id": uid}, {"_id": 0})
    data = with_plans(with_geo(body.model_dump()))
    if existing:
        relist = existing.get("status") == "approved" and (data["name"] != existing.get("name") or data["photo"] != existing.get("photo"))
        await db.creators.update_one({"user_id": uid}, {"$set": {**data, "updated_at": iso(), **({"status": "pending"} if relist else {})}})
        if relist:
            await notify(uid, "approval", "You changed your name or photo, so your profile is back under a quick review.", "/app/profile")
    else:
        await db.creators.insert_one({**data, "user_id": uid, "status": "pending", "live": True, "rating_avg": 0, "rating_count": 0,
                                      "deals_done": 0, "created_at": iso()})
        await db.users.update_one({"user_id": uid}, {"$set": {"active_mode": "creator"}})
        await notify(uid, "approval", "Your creator profile is submitted. It goes live once our team approves it.", "/app/profile")
    return await db.creators.find_one({"user_id": uid}, {"_id": 0, "loc": 0})


@api.put("/businesses/me")
async def upsert_business(body: BusinessIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    existing = await db.businesses.find_one({"user_id": uid})
    await db.businesses.update_one({"user_id": uid}, {"$set": {**with_geo(body.model_dump()), "updated_at": iso()},
                                                     "$setOnInsert": {"user_id": uid, "live": True, "created_at": iso()}}, upsert=True)
    if not existing:
        await db.users.update_one({"user_id": uid}, {"$set": {"active_mode": "business"}})
    return await db.businesses.find_one({"user_id": uid}, {"_id": 0, "loc": 0})


# ---------- visibility, posts, jobs ----------
@api.patch("/me/visibility")
async def set_visibility(body: VisibilityIn, member: dict = Depends(current_member)):
    col = db.creators if body.kind == "creator" else db.businesses
    r = await col.update_one({"user_id": member["user_id"]}, {"$set": {"live": body.live}})
    if not r.matched_count:
        raise HTTPException(404, "Profile not found")
    return {"ok": True}


@api.put("/creators/me/posts")
async def set_posts(body: PostsIn, member: dict = Depends(current_member)):
    if any(len(p) > 900_000 for p in body.posts):
        raise HTTPException(400, "Image too large")
    r = await db.creators.update_one({"user_id": member["user_id"]}, {"$set": {"samples": body.posts}})
    if not r.matched_count:
        raise HTTPException(404, "Create your creator profile first")
    return {"ok": True}


JOB_PUBLIC = {"_id": 0, "loc": 0}


async def my_business(uid: str) -> dict:
    b = await db.businesses.find_one({"user_id": uid}, {"_id": 0})
    if not b:
        raise HTTPException(400, "Create your business profile first")
    return b


@api.post("/jobs")
async def create_job(body: JobIn, member: dict = Depends(current_member)):
    b = await my_business(member["user_id"])
    job = {**body.model_dump(), "id": new_id(), "business_id": b["user_id"], "company": b["company"], "logo": b.get("logo", ""),
           "industry": b["industry"], "city": b["city"], "state": b.get("state", ""), "loc": b.get("loc"), "interested": 0,
           "created_at": iso(), "updated_at": iso()}
    await db.jobs.insert_one({**job})
    job.pop("loc", None)
    return job


@api.put("/jobs/{job_id}")
async def update_job(job_id: str, body: JobIn, member: dict = Depends(current_member)):
    r = await db.jobs.update_one({"id": job_id, "business_id": member["user_id"], "status": {"$ne": "removed"}},
                                 {"$set": {**body.model_dump(), "updated_at": iso()}})
    if not r.matched_count:
        raise HTTPException(404, "Job not found")
    return await db.jobs.find_one({"id": job_id}, JOB_PUBLIC)


@api.delete("/jobs/{job_id}")
async def delete_job(job_id: str, member: dict = Depends(current_member)):
    r = await db.jobs.delete_one({"id": job_id, "business_id": member["user_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Job not found")
    await db.interests.delete_many({"job_id": job_id})
    return {"ok": True}


@api.get("/jobs/mine")
async def my_jobs(member: dict = Depends(current_member)):
    jobs = await db.jobs.find({"business_id": member["user_id"]}, JOB_PUBLIC).sort("created_at", -1).to_list(200)
    ints = await db.interests.find({"job_id": {"$in": [j["id"] for j in jobs]}}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for j in jobs:
        j["interests"] = [i for i in ints if i["job_id"] == j["id"]]
    return jobs


@api.get("/jobs")
async def list_jobs(state: str = "", city: str = "", lat: Optional[float] = None, lng: Optional[float] = None,
                    radius_km: int = 0, plan: str = "", member: dict = Depends(current_member)):
    live_biz = [b["user_id"] for b in await db.businesses.find({"live": {"$ne": False}, **HIDE}, {"user_id": 1}).to_list(5000)]
    query = {"status": "open", "business_id": {"$in": live_biz}, "blocked": {"$ne": True}}
    if plan in RATE_FIELD:
        query["plans"] = plan
    apply_location(query, state, city, lat, lng, radius_km)
    jobs = add_distance(await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(200), lat, lng, radius_km > 0)
    mine = {i["job_id"] for i in await db.interests.find({"creator_id": member["user_id"]}, {"job_id": 1}).to_list(2000)}
    for j in jobs:
        j["applied"] = j["id"] in mine
    return jobs


@api.get("/businesses/{biz_id}")
async def business_profile(biz_id: str, member: dict = Depends(current_member)):
    b = await db.businesses.find_one({"user_id": biz_id}, {"_id": 0, "phone": 0, "loc": 0})
    if not b or ((b.get("blocked") or b.get("removed")) and biz_id != member["user_id"]):
        raise HTTPException(404, "Business not found")
    hidden = b.get("live") is False and biz_id != member["user_id"]
    jobs = [] if hidden else await db.jobs.find({"business_id": biz_id, "status": "open"}, JOB_PUBLIC).sort("created_at", -1).to_list(50)
    return {**b, "jobs": jobs}


@api.post("/jobs/{job_id}/interest")
async def show_interest(job_id: str, body: InterestIn, member: dict = Depends(current_member)):
    c = await db.creators.find_one({"user_id": member["user_id"]}, {"_id": 0})
    if not c:
        raise HTTPException(400, "Create your creator profile first")
    job = await db.jobs.find_one({"id": job_id, "status": "open"}, {"_id": 0})
    if not job:
        raise HTTPException(404, "This job is no longer open")
    if job["business_id"] == member["user_id"]:
        raise HTTPException(400, "This is your own job")
    if not await db.businesses.find_one({"user_id": job["business_id"], "live": {"$ne": False}, **HIDE}):
        raise HTTPException(404, "This job is no longer open")
    doc = {"id": new_id(), "job_id": job_id, "job_title": job["title"], "business_id": job["business_id"], "company": job["company"],
           "creator_id": c["user_id"], "creator_name": c["name"], "creator_photo": c["photo"], "from_price": c.get("from_price"),
           "note": body.note, "status": "sent", "created_at": iso()}
    r = await db.interests.update_one({"job_id": job_id, "creator_id": c["user_id"]}, {"$setOnInsert": doc}, upsert=True)
    if r.upserted_id:
        await db.jobs.update_one({"id": job_id}, {"$inc": {"interested": 1}})
        await notify(job["business_id"], "interest", f"{c['name']} is interested in your job '{job['title']}'", "/app/jobs")
    return {"ok": True}


@api.get("/interests/mine")
async def my_interests(member: dict = Depends(current_member)):
    return await db.interests.find({"creator_id": member["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.patch("/interests/{interest_id}")
async def set_interest(interest_id: str, body: InterestStatusIn, member: dict = Depends(current_member)):
    i = await db.interests.find_one_and_update({"id": interest_id, "business_id": member["user_id"]}, {"$set": {"status": body.status}}, projection={"_id": 0})
    if not i:
        raise HTTPException(404, "Not found")
    if body.status != "offered":
        await notify(i["creator_id"], "interest", f"{i['company']} {'shortlisted' if body.status == 'shortlisted' else 'passed on'} you for '{i['job_title']}'", "/app/jobs")
    return {"ok": True}


# ---------- saved ----------
@api.get("/businesses")
async def list_businesses(state: str = "", city: str = "", lat: Optional[float] = None, lng: Optional[float] = None,
                          radius_km: int = 0, _: dict = Depends(current_member)):
    query = dict(HIDE)
    apply_location(query, state, city, lat, lng, radius_km)
    docs = await db.businesses.find(query, {"_id": 0, "phone": 0}).sort("created_at", -1).to_list(200)
    return add_distance(docs, lat, lng, radius_km > 0)


@api.get("/saved")
async def list_saved(member: dict = Depends(current_member)):
    rows = await db.saved.find({"user_id": member["user_id"]}, {"_id": 0}).to_list(500)
    cids = [s["creator_id"] for s in rows if s.get("kind", "creator") == "creator"]
    bids = [s["creator_id"] for s in rows if s.get("kind") == "business"]
    return {"creators": await db.creators.find({"user_id": {"$in": cids}, "status": "approved", **HIDE}, {"_id": 0, "phone": 0, "samples": 0}).to_list(500),
            "businesses": await db.businesses.find({"user_id": {"$in": bids}, **HIDE}, {"_id": 0, "phone": 0}).to_list(500)}


@api.get("/saved/ids")
async def saved_ids(member: dict = Depends(current_member)):
    return [s["creator_id"] for s in await db.saved.find({"user_id": member["user_id"]}, {"_id": 0}).to_list(500)]


@api.post("/saved/{creator_id}")
async def save_creator(creator_id: str, kind: Literal["creator", "business"] = "creator", member: dict = Depends(current_member)):
    col = db.creators if kind == "creator" else db.businesses
    if not await col.find_one({"user_id": creator_id}):
        raise HTTPException(404, "Not found")
    await db.saved.update_one({"user_id": member["user_id"], "creator_id": creator_id},
                              {"$setOnInsert": {"user_id": member["user_id"], "creator_id": creator_id, "kind": kind, "created_at": iso()}}, upsert=True)
    return {"ok": True}


@api.delete("/saved/{creator_id}")
async def unsave_creator(creator_id: str, member: dict = Depends(current_member)):
    await db.saved.delete_one({"user_id": member["user_id"], "creator_id": creator_id})
    return {"ok": True}


# ---------- deals ----------
@api.post("/deals")
async def create_deal(body: OfferIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    business = await db.businesses.find_one({"user_id": uid}, {"_id": 0})
    if not business:
        raise HTTPException(400, "Create your business profile first")
    creator = await db.creators.find_one({"user_id": body.creator_id, "status": "approved", **HIDE}, {"_id": 0})
    if not creator:
        raise HTTPException(404, "Creator not found")
    if body.creator_id == uid:
        raise HTTPException(400, "You can't send an offer to yourself")
    if creator.get("live") is False:
        raise HTTPException(400, f"{creator['name']} is offline right now and isn't taking new offers")
    if not creator.get(RATE_FIELD[body.plan]):
        raise HTTPException(400, f"{creator['name']} doesn't offer the {PLAN_LABEL[body.plan]} plan")
    await check_contact(member, body.creator_id)
    offer = {"plan": body.plan, "plan_label": PLAN_LABEL[body.plan], "brief": body.brief, "start_date": body.start_date,
             "price": body.price, "counter_price": None, "status": "pending", "updated_at": iso()}
    thread = await db.deals.find_one_and_update({"business_id": uid, "creator_id": body.creator_id, "status": "chat"},
                                                {"$set": offer, "$push": {"history": {"status": "pending", "at": iso()}}},
                                                projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if thread:
        await notify(body.creator_id, "offer", f"New {offer['plan_label']} offer from {business['company']} for ₹{body.price:,}", f"/app/chat/{thread['id']}")
        return thread
    deal = {"id": new_id(), "free_chat": not is_pro(member), "business_id": uid, "creator_id": body.creator_id, "business_name": business["company"],
            "business_logo": business.get("logo", ""), "creator_name": creator["name"], "creator_photo": creator["photo"],
            "plan": body.plan, "plan_label": PLAN_LABEL[body.plan], "brief": body.brief, "start_date": body.start_date,
            "price": body.price, "counter_price": None, "status": "pending", "delivery_link": "", "payout_status": None,
            "rating": None, "history": [{"status": "pending", "at": iso()}], "created_at": iso(), "updated_at": iso()}
    await db.deals.insert_one({**deal})
    await notify(body.creator_id, "offer", f"New {deal['plan_label']} offer from {business['company']} for ₹{body.price:,}", f"/app/chat/{deal['id']}")
    return deal


class ChatIn(BaseModel):
    creator_id: str = Field(min_length=1, max_length=80)


@api.post("/chats")
async def start_chat(body: ChatIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    business = await db.businesses.find_one({"user_id": uid}, {"_id": 0})
    if not business:
        raise HTTPException(400, "Create your business profile first")
    if body.creator_id == uid:
        raise HTTPException(400, "You can't message yourself")
    existing = await db.deals.find_one({"business_id": uid, "creator_id": body.creator_id, "status": {"$nin": list(CLOSED_DEALS)}},
                                       {"_id": 0, "id": 1}, sort=[("updated_at", -1)])
    if existing:
        return existing
    creator = await db.creators.find_one({"user_id": body.creator_id, "status": "approved", **HIDE}, {"_id": 0})
    if not creator:
        raise HTTPException(404, "Creator not found")
    await check_contact(member, body.creator_id)
    deal = {"id": new_id(), "business_id": uid, "creator_id": body.creator_id, "business_name": business["company"],
            "business_logo": business.get("logo", ""), "creator_name": creator["name"], "creator_photo": creator["photo"],
            "plan": None, "plan_label": "Chat", "brief": "", "start_date": "", "price": 0, "counter_price": None, "status": "chat",
            "free_chat": not is_pro(member), "delivery_link": "", "payout_status": None, "rating": None,
            "history": [{"status": "chat", "at": iso()}], "created_at": iso(), "updated_at": iso()}
    await db.deals.insert_one({**deal})
    return {"id": deal["id"]}


@api.get("/deals")
async def list_deals(side: Literal["business", "creator", "all"] = "all", member: dict = Depends(current_member)):
    uid = member["user_id"]
    q = {"business_id": uid} if side == "business" else {"creator_id": uid} if side == "creator" else \
        {"$or": [{"business_id": uid}, {"creator_id": uid}]}
    return await db.deals.find(q, {"_id": 0}).sort("updated_at", -1).to_list(500)


@api.get("/deals/{deal_id}")
async def get_deal(deal_id: str, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    biz_user = await db.users.find_one({"user_id": deal["business_id"]}, {"_id": 0})
    chat_open = bool(biz_user and (is_pro(biz_user) or deal.get("free_chat")))
    return {**deal, "chat_open": chat_open, "is_business": deal["business_id"] == member["user_id"],
            "is_creator": deal["creator_id"] == member["user_id"]}


@api.post("/deals/{deal_id}/action")
async def deal_action(deal_id: str, body: DealAction, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    uid, a, st = member["user_id"], body.action, deal["status"]
    is_b, is_c = deal["business_id"] == uid, deal["creator_id"] == uid
    if deal.get("paused"):
        raise HTTPException(400, "This deal is paused while our team reviews an account")
    upd, new_status, msg_to, msg = {}, None, None, ""
    if a in ("accept", "decline", "counter") and is_c and st == "pending":
        if a == "counter":
            if not body.price:
                raise HTTPException(400, "Enter your counter price")
            upd["counter_price"], new_status = body.price, "countered"
            msg = f"{deal['creator_name']} sent a counter-offer of ₹{body.price:,}"
        else:
            new_status = "accepted" if a == "accept" else "declined"
            msg = f"{deal['creator_name']} {new_status} your {deal['plan_label']} offer"
        msg_to = deal["business_id"]
    elif a == "accept_counter" and is_b and st == "countered":
        upd["price"], new_status, msg_to = deal["counter_price"], "accepted", deal["creator_id"]
        msg = f"{deal['business_name']} accepted your counter of ₹{deal['counter_price']:,}"
    elif a == "decline" and is_b and st == "countered":
        new_status, msg_to, msg = "declined", deal["creator_id"], f"{deal['business_name']} declined your counter-offer"
    elif a == "cancel" and is_b and st in ("pending", "countered", "accepted"):
        new_status, msg_to, msg = "cancelled", deal["creator_id"], f"{deal['business_name']} cancelled the offer"
    elif a == "submit_work" and is_c and st == "paid":
        if not body.link:
            raise HTTPException(400, "Add a link to the finished work")
        upd["delivery_link"], msg_to = body.link, deal["business_id"]
        msg = f"{deal['creator_name']} submitted the work. Review it and mark it delivered."
    elif a == "mark_delivered" and is_b and st == "paid":
        if not deal.get("delivery_link"):
            raise HTTPException(400, "The creator hasn't submitted the work yet")
        new_status, upd["payout_status"], msg_to = "delivered", "pending", deal["creator_id"]
        msg = f"{deal['business_name']} approved your work. Your payout is being released."
    elif a == "dispute" and is_b and st == "paid":
        if not (body.note or "").strip():
            raise HTTPException(400, "Tell us what went wrong")
        new_status, upd["payout_status"], msg_to = "disputed", "on_hold", deal["creator_id"]
        msg = f"{deal['business_name']} raised a dispute. The payout is on hold while our team reviews it."
    else:
        raise HTTPException(400, "This action isn't available right now")
    upd["updated_at"] = iso()
    ops = {"$set": upd}
    if new_status:
        upd["status"] = new_status
        ops["$push"] = {"history": {"status": new_status, "at": iso()}}
    r = await db.deals.update_one({"id": deal_id, "status": st}, ops)
    if not r.matched_count:
        raise HTTPException(409, "This deal just changed. Refresh and try again.")
    if msg_to:
        await notify(msg_to, "deal", msg, f"/app/chat/{deal_id}")
    if a == "dispute":
        await db.reports.insert_one({"id": new_id(), "kind": "dispute", "status": "open", "reporter_id": uid,
                                     "reporter_name": deal["business_name"], "target_type": "deal", "target_id": deal_id,
                                     "target_user_id": deal["creator_id"], "target_label": f"{deal['business_name']} ↔ {deal['creator_name']}",
                                     "reason": "dispute", "note": body.note.strip(), "created_at": iso()})
    if a == "mark_delivered":
        await release_payout(deal_id)
    return await db.deals.find_one({"id": deal_id}, {"_id": 0})


@api.post("/deals/{deal_id}/rate")
async def rate_deal(deal_id: str, body: RatingIn, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    if deal["business_id"] != member["user_id"] or deal["status"] not in ("delivered", "completed") or deal.get("rating"):
        raise HTTPException(400, "You can rate once the work is delivered")
    await db.deals.update_one({"id": deal_id}, {"$set": {"rating": body.model_dump(), "rated_at": iso()}})
    c = await db.creators.find_one({"user_id": deal["creator_id"]}, {"_id": 0})
    if c:
        cnt = c.get("rating_count", 0) + 1
        avg = round(((c.get("rating_avg", 0) * c.get("rating_count", 0)) + body.stars) / cnt, 1)
        await db.creators.update_one({"user_id": deal["creator_id"]}, {"$set": {"rating_avg": avg, "rating_count": cnt}})
    await notify(deal["creator_id"], "rating", f"{deal['business_name']} rated you {body.stars}★", f"/app/creator/{deal['creator_id']}")
    return {"ok": True}


# ---------- chat ----------
@api.get("/deals/{deal_id}/messages")
async def list_messages(deal_id: str, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    msgs = await db.messages.find({"deal_id": deal_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    if deal["status"] not in PAID_STATES:
        for m in msgs:
            m["text"] = mask(m["text"])
    return msgs


@api.post("/deals/{deal_id}/messages")
async def send_message(deal_id: str, body: MessageIn, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    biz_user = await db.users.find_one({"user_id": deal["business_id"]}, {"_id": 0})
    if not (biz_user and (is_pro(biz_user) or deal.get("free_chat"))):
        raise HTTPException(402, "Chat unlocks when the business upgrades to Business Pro")
    if deal["status"] in ("declined", "cancelled"):
        raise HTTPException(400, "This deal is closed")
    if deal.get("paused"):
        raise HTTPException(400, "This deal is paused while our team reviews an account")
    is_b = deal["business_id"] == member["user_id"]
    if not is_b and deal["creator_id"] != member["user_id"]:
        raise HTTPException(403, "Only the business and the creator can post in this chat")
    msg = {"id": new_id(), "deal_id": deal_id, "sender_id": member["user_id"],
           "sender_name": deal["business_name"] if is_b else deal["creator_name"], "text": body.text.strip(), "created_at": iso()}
    await db.messages.insert_one({**msg})
    await db.deals.update_one({"id": deal_id}, {"$set": {"updated_at": iso(), "last_message": body.text[:80]}})
    await notify(deal["creator_id"] if is_b else deal["business_id"], "message", f"New message from {msg['sender_name']}", f"/app/chat/{deal_id}")
    if deal["status"] not in PAID_STATES:
        msg["text"] = mask(msg["text"])
    return msg


# ---------- notifications ----------
@api.get("/notifications")
async def list_notifications(member: dict = Depends(current_member)):
    return await db.notifications.find({"user_id": member["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/notifications/read")
async def read_notifications(member: dict = Depends(current_member)):
    await db.notifications.update_many({"user_id": member["user_id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- payments ----------
@api.post("/payments/order")
async def create_order(body: OrderIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    prices = await pricing()
    if body.kind == "pro":
        if not await db.businesses.find_one({"user_id": uid}):
            raise HTTPException(400, "Create your business profile first")
        amount, desc, deal_id = prices["pro_price"], f"Business Pro – {prices['pro_days']} days", None
    else:
        deal = await get_deal_for(body.deal_id or "", member)
        if deal["business_id"] != uid or deal["status"] != "accepted":
            raise HTTPException(400, "This deal can't be paid right now")
        if not is_pro(member):
            raise HTTPException(402, "Upgrade to Business Pro to pay in the app")
        amount, desc, deal_id = deal["price"], f"{deal['plan_label']} – {deal['creator_name']}", deal["id"]
    pay = {"id": new_id(), "user_id": uid, "kind": body.kind, "deal_id": deal_id, "amount": amount, "description": desc,
           "fee": round(amount * prices["fee_pct"] / 100) if body.kind == "deal" else amount, "fee_pct": prices["fee_pct"],
           "pro_days": prices["pro_days"], "status": "created", "created_at": iso()}
    rz = rzp_client()
    if rz:
        order = await run_in_threadpool(rz.order.create, {"amount": amount * 100, "currency": "INR", "receipt": pay["id"][:40], "payment_capture": 1})
        pay["gateway_order_id"], pay["mode"] = order["id"], "razorpay"
    else:
        pay["gateway_order_id"], pay["mode"] = f"test_{pay['id'][:8]}", "test"
    await db.payments.insert_one({**pay})
    return {"payment_id": pay["id"], "mode": pay["mode"], "order_id": pay["gateway_order_id"], "amount": amount * 100,
            "currency": "INR", "description": desc, "key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            "prefill": {"name": member.get("name", ""), "email": member.get("email", "")}}


@api.post("/payments/verify")
async def verify_payment(body: VerifyIn, member: dict = Depends(current_member)):
    pay = await db.payments.find_one({"id": body.payment_id, "user_id": member["user_id"]}, {"_id": 0})
    if not pay:
        raise HTTPException(404, "Payment not found")
    if pay["status"] == "paid":
        return {"ok": True}
    if pay["mode"] == "razorpay":
        secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        expected = hmac.new(secret.encode(), f"{pay['gateway_order_id']}|{body.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
        if not body.razorpay_signature or not hmac.compare_digest(expected, body.razorpay_signature):
            raise HTTPException(400, "Payment verification failed")
        await mark_payment_done(pay, body.razorpay_payment_id)
    else:
        if rzp_client():
            raise HTTPException(400, "Test payments are disabled")
        await mark_payment_done(pay, f"testpay_{new_id()[:8]}")
    return {"ok": True}


@api.get("/payments/mine")
async def my_payments(member: dict = Depends(current_member)):
    return await db.payments.find({"user_id": member["user_id"], "status": "paid"}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------- admin ----------
admin_dep = require_role("owner", "admin")


owner_dep = require_role("owner")


async def log_action(admin: dict, action: str, target: str, detail: str = ""):
    await db.admin_log.insert_one({"id": new_id(), "admin_id": admin["user_id"], "admin_name": admin.get("name") or admin.get("email", ""),
                                   "action": action, "target": target, "detail": detail, "at": iso()})


async def release_payout(deal_id: str) -> dict:
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    payout = await db.payouts.find_one({"deal_id": deal_id}, {"_id": 0})
    if payout and payout["status"] == "released":
        return payout
    amount = deal["price"] - round(deal["price"] * deal.get("fee_pct", (await pricing())["fee_pct"]) / 100)
    if not payout:
        payout = {"id": new_id(), "deal_id": deal_id, "creator_id": deal["creator_id"], "creator_name": deal["creator_name"],
                  "business_name": deal["business_name"], "amount": amount, "mode": "test", "status": "pending",
                  "attempts": 0, "created_at": iso()}
        await db.payouts.insert_one({**payout})
    user = await db.users.find_one({"user_id": deal["creator_id"]}, {"_id": 0, "payout_upi": 1}) or {}
    upi = (user.get("payout_upi") or "").strip()
    attempt = {"attempts": payout.get("attempts", 0) + 1, "last_attempt_at": iso()}
    if not upi and not deal["creator_id"].startswith("sample_"):
        await db.payouts.update_one({"id": payout["id"]}, {"$set": {**attempt, "status": "failed", "error": "Creator has no payout UPI yet"}})
        await db.deals.update_one({"id": deal_id}, {"$set": {"payout_status": "failed", "updated_at": iso()}})
        await notify(deal["creator_id"], "payout", f"Add your payout UPI in Settings to receive ₹{amount:,} for '{deal['plan_label']}'.", "/app/settings")
        return {**payout, "status": "failed"}
    # Real transfers need RazorpayX; until then payouts are recorded in test mode (MOCKED).
    await db.payouts.update_one({"id": payout["id"]}, {"$set": {**attempt, "status": "released", "upi": upi, "error": "", "released_at": iso()}})
    await db.deals.update_one({"id": deal_id}, {"$set": {"status": "completed", "payout_status": "released", "payout_amount": amount,
                                                         "released_at": iso(), "updated_at": iso()},
                                                "$push": {"history": {"status": "completed", "at": iso()}}})
    await db.creators.update_one({"user_id": deal["creator_id"]}, {"$inc": {"deals_done": 1}})
    await notify(deal["creator_id"], "payout", f"Payout of ₹{amount:,} released to your payout account.", f"/app/chat/{deal_id}")
    await notify(deal["business_id"], "deal", f"Deal with {deal['creator_name']} is completed.", f"/app/chat/{deal_id}")
    return {**payout, "status": "released"}


async def refund_deal(deal: dict):
    await db.deals.update_one({"id": deal["id"]}, {"$set": {"status": "refunded", "payout_status": "refunded", "updated_at": iso()}, "$unset": {"paused": ""},
                                                  "$push": {"history": {"status": "refunded", "at": iso()}}})
    await db.payments.update_one({"deal_id": deal["id"], "status": "paid"}, {"$set": {"refund_status": "refunded", "refund_mode": "test", "refunded_at": iso()}})


def since_of(rng: str) -> Optional[str]:
    if rng == "today":
        return now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    if rng in ("7d", "30d"):
        return (now() - timedelta(days=int(rng[:-1]))).isoformat()
    return None


@api.post("/reports")
async def file_report(body: ReportIn, member: dict = Depends(current_member)):
    uid, t, tid = member["user_id"], body.target_type, body.target_id
    target_user, label = None, ""
    if t == "creator":
        d = await db.creators.find_one({"user_id": tid}, {"_id": 0, "name": 1})
        target_user, label = tid, d and d["name"]
    elif t == "business":
        d = await db.businesses.find_one({"user_id": tid}, {"_id": 0, "company": 1})
        target_user, label = tid, d and d["company"]
    elif t == "job":
        d = await db.jobs.find_one({"id": tid}, {"_id": 0, "business_id": 1, "title": 1, "company": 1})
        if d:
            target_user, label = d["business_id"], f"{d['title']} · {d['company']}"
    else:
        d = await db.deals.find_one({"id": tid, "$or": [{"business_id": uid}, {"creator_id": uid}]}, {"_id": 0})
        if d:
            target_user = d["creator_id"] if d["business_id"] == uid else d["business_id"]
            label = f"{d['business_name']} ↔ {d['creator_name']}"
    if not d:
        raise HTTPException(404, "Not found")
    if target_user == uid:
        raise HTTPException(400, "You can't report yourself")
    rep = {"id": new_id(), "kind": "report", "status": "open", "reporter_id": uid, "reporter_name": member.get("name", ""),
           "target_type": t, "target_id": tid, "target_user_id": target_user, "target_label": label,
           "reason": body.reason, "note": body.note.strip(), "created_at": iso()}
    try:
        await db.reports.insert_one({**rep})
    except DuplicateKeyError:
        raise HTTPException(409, "You've already reported this")
    return {"ok": True}


# ---------- admin: dashboard & approvals ----------
@api.get("/admin/stats")
async def admin_stats(range: Literal["today", "7d", "30d", "all"] = "all", _: dict = Depends(admin_dep)):
    s = since_of(range)

    def win(field: str) -> dict:
        return {field: {"$gte": s}} if s else {}
    real = {"is_sample": {"$ne": True}}
    pays = await db.payments.find({"status": "paid", **win("paid_at")}, {"_id": 0, "amount": 1, "fee": 1, "kind": 1, "refund_status": 1}).to_list(50000)
    outs = await db.payouts.find({"status": "released", **win("released_at")}, {"_id": 0, "amount": 1}).to_list(50000)
    kept = [p for p in pays if p.get("refund_status") != "refunded"]
    count = lambda col, q: db[col].count_documents(q)  # noqa: E731
    return {
        "users": await count("users", {**IN_ENV, **win("created_at")}),
        "creators_live": await count("creators", {"status": "approved", "live": {"$ne": False}, **HIDE, **real, **win("created_at")}),
        "creators_pending": await count("creators", {"status": "pending", **win("created_at")}),
        "creators_rejected": await count("creators", {"status": "rejected", **win("created_at")}),
        "businesses": await count("businesses", win("created_at")),
        "pro_subs": await count("users", {"pro_until": {"$gt": iso()}, **IN_ENV}),
        "open_jobs": await count("jobs", {"status": "open", **win("created_at")}),
        "active_deals": await count("deals", {"status": {"$in": ACTIVE_DEALS}, **win("created_at")}),
        "completed_deals": await count("deals", {"status": "completed", **win("released_at")}),
        "paid_by_businesses": sum(p["amount"] for p in kept),
        "platform_earnings": sum(p["fee"] if p["kind"] == "deal" else p["amount"] for p in kept),
        "paid_out": sum(p["amount"] for p in outs),
        "attention": {"pending_creators": await count("creators", {"status": "pending"}),
                      "open_reports": await count("reports", {"kind": "report", "status": "open"}),
                      "disputes": await count("reports", {"kind": "dispute", "status": "open"}),
                      "failed_payouts": await count("payouts", {"status": "failed"})},
        "money_mode": "live" if rzp_client() else "test",
    }


@api.get("/admin/creators")
async def admin_creators(status: Literal["pending", "approved", "rejected"] = "pending", _: dict = Depends(admin_dep)):
    return await db.creators.find({"status": status, "is_sample": {"$ne": True}}, {"_id": 0, "loc": 0}).sort("updated_at", -1).to_list(300)


@api.patch("/admin/creators/{creator_id}")
async def admin_review_creator(creator_id: str, body: CreatorReviewIn, admin: dict = Depends(admin_dep)):
    reason = body.reason.strip()
    if body.status == "rejected" and len(reason) < 3:
        raise HTTPException(400, "Add a short reason for the rejection")
    c = await db.creators.find_one_and_update({"user_id": creator_id},
                                              {"$set": {"status": body.status, "review_note": reason if body.status == "rejected" else "",
                                                        "reviewed_at": iso()}}, projection={"_id": 0, "name": 1})
    if not c:
        raise HTTPException(404, "Not found")
    text = "Your creator profile is live! Businesses can now find you." if body.status == "approved" else \
        f"Your creator profile wasn't approved: {reason}. Edit your profile and it goes back for review."
    await notify(creator_id, "approval", text, "/app/profile")
    await log_action(admin, body.status, f"Creator {c['name']}", reason)
    return {"ok": True}


# ---------- admin: users ----------
USER_FIELDS = ("user_id", "name", "email", "image_url", "role", "blocked", "block_reason", "created_at", "active_mode", "payout_upi")


@api.get("/admin/users")
async def admin_users(q: str = "", role: str = "", status: str = "", pro: str = "", _: dict = Depends(admin_dep)):
    query = dict(IN_ENV)
    if q:
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"email": rx}]
    if status == "blocked":
        query["blocked"] = True
    elif status == "active":
        query["blocked"] = {"$ne": True}
    if pro == "yes":
        query["pro_until"] = {"$gt": iso()}
    people = await db.users.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    ids = [p["user_id"] for p in people]
    cids = {c["user_id"] for c in await db.creators.find({"user_id": {"$in": ids}}, {"user_id": 1}).to_list(1000)}
    bids = {b["user_id"] for b in await db.businesses.find({"user_id": {"$in": ids}}, {"user_id": 1}).to_list(1000)}
    out = []
    for p in people:
        kind = "both" if p["user_id"] in cids and p["user_id"] in bids else "creator" if p["user_id"] in cids else \
            "business" if p["user_id"] in bids else "none"
        if role and kind != role:
            continue
        out.append({**{k: p.get(k) for k in USER_FIELDS}, "role": effective_role(p.get("role")), "kind": kind, "is_pro": is_pro(p)})
    return out


@api.get("/admin/users/{user_id}")
async def admin_user(user_id: str, _: dict = Depends(admin_dep)):
    u = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    either = {"$or": [{"business_id": user_id}, {"creator_id": user_id}]}
    return {"user": {**{k: u.get(k) for k in USER_FIELDS}, "role": effective_role(u.get("role")), "is_pro": is_pro(u), "pro_until": u.get("pro_until")},
            "creator": await db.creators.find_one({"user_id": user_id}, {"_id": 0, "loc": 0}),
            "business": await db.businesses.find_one({"user_id": user_id}, {"_id": 0, "loc": 0}),
            "jobs": await db.jobs.find({"business_id": user_id}, JOB_PUBLIC).sort("created_at", -1).to_list(100),
            "deals": await db.deals.find(either, {"_id": 0, "history": 0}).sort("updated_at", -1).to_list(100),
            "reports": await db.reports.find({"target_user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100),
            "payments": await db.payments.find({"user_id": user_id, "status": "paid"}, {"_id": 0}).sort("created_at", -1).to_list(100),
            "payouts": await db.payouts.find({"creator_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)}


async def set_blocked(admin: dict, user_id: str, blocked: bool, reason: str):
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if not target:
        raise HTTPException(404, "User not found")
    if user_id == admin["user_id"]:
        raise HTTPException(400, "You can't block yourself")
    t_role = effective_role(target.get("role"))
    if t_role == "owner":
        raise HTTPException(403, "The main admin can't be blocked")
    if t_role == "admin" and admin["role"] != "owner":
        raise HTTPException(403, "Only the main admin can block another admin")
    flag = {"$set": {"blocked": True}} if blocked else {"$unset": {"blocked": ""}}
    await db.users.update_one({"user_id": user_id}, {"$set": {"blocked": True, "block_reason": reason, "blocked_at": iso(), "blocked_by": admin["user_id"]}}
                              if blocked else {"$unset": {"blocked": "", "block_reason": "", "blocked_at": "", "blocked_by": ""}})
    await db.creators.update_many({"user_id": user_id}, flag)
    await db.businesses.update_many({"user_id": user_id}, flag)
    await db.jobs.update_many({"business_id": user_id}, flag)
    either = {"$or": [{"business_id": user_id}, {"creator_id": user_id}]}
    if blocked:
        await db.deals.update_many({**either, "status": {"$in": ACTIVE_DEALS}}, {"$set": {"paused": True}})
        try:
            await run_in_threadpool(_revoke_sessions, user_id)
        except Exception as e:  # the per-request blocked check still locks them out
            logger.warning("session revoke failed for %s: %s", user_id, e)
    else:
        await db.deals.update_many({**either, "paused": True}, {"$unset": {"paused": ""}})
        await notify(user_id, "approval", "Your account has been restored. Welcome back!", "/app")
    await log_action(admin, "blocked" if blocked else "unblocked", f"User {target.get('name') or target.get('email')}", reason)


@api.post("/admin/users/{user_id}/block")
async def admin_block(user_id: str, body: ReasonIn, admin: dict = Depends(admin_dep)):
    await set_blocked(admin, user_id, True, body.reason.strip())
    return {"ok": True}


@api.post("/admin/users/{user_id}/unblock")
async def admin_unblock(user_id: str, body: ReasonIn, admin: dict = Depends(admin_dep)):
    await set_blocked(admin, user_id, False, body.reason.strip())
    return {"ok": True}


# ---------- admin: content ----------
@api.get("/admin/jobs")
async def admin_jobs(_: dict = Depends(admin_dep)):
    return await db.jobs.find({}, JOB_PUBLIC).sort("created_at", -1).to_list(500)


@api.post("/admin/jobs/{job_id}/remove")
async def admin_remove_job(job_id: str, body: ReasonIn, admin: dict = Depends(admin_dep)):
    job = await db.jobs.find_one_and_update({"id": job_id}, {"$set": {"status": "removed", "removed_reason": body.reason.strip(), "updated_at": iso()}},
                                            projection={"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    await notify(job["business_id"], "approval", f"Your job '{job['title']}' was removed by our team: {body.reason.strip()}", "/app/jobs")
    await log_action(admin, "removed", f"Job {job['title']}", body.reason.strip())
    return {"ok": True}


@api.get("/admin/posts")
async def admin_posts(_: dict = Depends(admin_dep)):
    out = []
    async for c in db.creators.find({"is_sample": {"$ne": True}, "samples.0": {"$exists": True}}, {"_id": 0, "user_id": 1, "name": 1, "photo": 1, "samples": 1}):
        out += [{"creator_id": c["user_id"], "creator_name": c["name"], "creator_photo": c["photo"], "index": i, "post": p, "prefix": p[:60]}
                for i, p in enumerate(c["samples"])]
    return out[:400]


@api.post("/admin/posts/remove")
async def admin_remove_post(body: PostRemoveIn, admin: dict = Depends(admin_dep)):
    c = await db.creators.find_one({"user_id": body.creator_id}, {"_id": 0, "name": 1, "samples": 1})
    posts = (c or {}).get("samples") or []
    if body.index >= len(posts) or not posts[body.index].startswith(body.prefix):
        raise HTTPException(409, "This post changed. Refresh and try again.")
    posts.pop(body.index)
    await db.creators.update_one({"user_id": body.creator_id}, {"$set": {"samples": posts}})
    await notify(body.creator_id, "approval", f"One of your posts was removed by our team: {body.reason.strip()}", "/app/posts")
    await log_action(admin, "removed", f"Post by {c['name']}", body.reason.strip())
    return {"ok": True}


# ---------- admin: deals & payouts ----------
@api.get("/admin/deals")
async def admin_deals(_: dict = Depends(admin_dep)):
    deals = await db.deals.find({}, {"_id": 0, "history": 0}).sort("updated_at", -1).to_list(500)
    outs = {p["deal_id"]: p for p in await db.payouts.find({"deal_id": {"$in": [d["id"] for d in deals]}}, {"_id": 0}).to_list(1000)}
    for d in deals:
        d["payout"] = outs.get(d["id"])
    return deals


@api.post("/admin/deals/{deal_id}/retry-payout")
async def admin_retry_payout(deal_id: str, admin: dict = Depends(admin_dep)):
    if not await db.payouts.find_one({"deal_id": deal_id, "status": "failed"}):
        raise HTTPException(400, "No failed payout for this deal")
    p = await release_payout(deal_id)
    await log_action(admin, "retried payout", f"Payout to {p['creator_name']}", p["status"])
    if p["status"] != "released":
        raise HTTPException(400, "Payout failed again: the creator still has no payout UPI")
    return {"ok": True}


# ---------- admin: reports & disputes ----------
@api.get("/admin/reports")
async def admin_reports(status: Literal["open", "resolved"] = "open", kind: str = "", _: dict = Depends(admin_dep)):
    q = {"status": status, **({"kind": kind} if kind else {})}
    return await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)


@api.get("/admin/reports/{report_id}")
async def admin_report(report_id: str, _: dict = Depends(admin_dep)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Report not found")
    t, tid = r["target_type"], r["target_id"]
    target = await (db.creators.find_one({"user_id": tid}, {"_id": 0, "loc": 0}) if t == "creator" else
                    db.businesses.find_one({"user_id": tid}, {"_id": 0, "loc": 0}) if t == "business" else
                    db.jobs.find_one({"id": tid}, JOB_PUBLIC) if t == "job" else db.deals.find_one({"id": tid}, {"_id": 0}))
    msgs = await db.messages.find({"deal_id": tid}, {"_id": 0}).sort("created_at", 1).to_list(500) if t == "deal" else []
    user = await db.users.find_one({"user_id": r["target_user_id"]}, {"_id": 0, **{k: 1 for k in USER_FIELDS}})
    return {**r, "target": target, "messages": msgs, "target_user": user}


@api.post("/admin/reports/{report_id}/resolve")
async def admin_resolve(report_id: str, body: ResolveIn, admin: dict = Depends(admin_dep)):
    r = await db.reports.find_one({"id": report_id, "status": "open"}, {"_id": 0})
    if not r:
        raise HTTPException(404, "This report is already closed")
    a, note, t, tid = body.action, body.note.strip(), r["target_type"], r["target_id"]
    if (r["kind"] == "dispute") != (a in ("release", "refund")):
        raise HTTPException(400, "Disputes end with release or refund; reports with dismiss, warn, remove or block")
    if a == "remove":
        if t == "deal":
            raise HTTPException(400, "A deal chat can't be removed. Warn or block the user instead.")
        if t == "creator":
            await db.creators.update_one({"user_id": tid}, {"$set": {"status": "rejected", "review_note": note}})
        elif t == "business":
            await db.businesses.update_one({"user_id": tid}, {"$set": {"removed": True}})
        else:
            await db.jobs.update_one({"id": tid}, {"$set": {"status": "removed", "removed_reason": note}})
    elif a == "block":
        await set_blocked(admin, r["target_user_id"], True, note)
    elif a in ("release", "refund"):
        deal = await db.deals.find_one({"id": tid, "status": "disputed"}, {"_id": 0})
        if not deal:
            raise HTTPException(400, "This deal is no longer in dispute")
        if a == "release":
            await db.deals.update_one({"id": tid}, {"$set": {"status": "delivered", "payout_status": "pending"}, "$unset": {"paused": ""}})
            await release_payout(tid)
        else:
            await refund_deal(deal)
    await db.reports.update_one({"id": report_id}, {"$set": {"status": "resolved", "resolution": {"action": a, "note": note, "by": admin.get("name", ""), "at": iso()}}})
    outcome = {"dismiss": "no action was needed", "warn": "the user was warned", "remove": "the content was removed",
               "block": "the account was blocked", "release": "the payout was released to the creator",
               "refund": "the payment was refunded to the business"}[a]
    await notify(r["reporter_id"], "approval", f"We reviewed your {'dispute' if r['kind'] == 'dispute' else 'report'} on {r['target_label']}: {outcome}.", "/app/notifications")
    if a != "dismiss" and a != "block":
        await notify(r["target_user_id"], "approval", f"HireMyFace team: {note}" if a == "warn" else f"Our team reviewed {r['target_label']}: {outcome}. {note}", "/app/notifications")
    await log_action(admin, f"resolved ({a})", r["target_label"], note)
    return {"ok": True}


# ---------- admin: team & log ----------
@api.get("/admin/team")
async def admin_team(_: dict = Depends(owner_dep)):
    admins = await db.users.find({"role": {"$in": list(ADMIN_ROLES)}, **IN_ENV}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1, "image_url": 1}).to_list(100)
    invites = await db.admin_invites.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"admins": admins, "invites": invites}


@api.post("/admin/team")
async def admin_add(body: TeamIn, admin: dict = Depends(owner_dep)):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}, **IN_ENV}, {"_id": 0})
    if user:
        if effective_role(user.get("role")) in ADMIN_ROLES:
            raise HTTPException(400, "This person is already an admin")
        if user.get("blocked"):
            raise HTTPException(400, "Unblock this account first")
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "admin"}})
        await notify(user["user_id"], "approval", "You're now a HireMyFace admin. Open the Admin panel from the menu.", "/admin")
        result = "added"
    else:
        await db.admin_invites.update_one({"email": email}, {"$setOnInsert": {"email": email, "invited_by": admin["user_id"], "created_at": iso()}}, upsert=True)
        result = "invited"
    await log_action(admin, "added admin" if result == "added" else "invited admin", email)
    return {"ok": True, "result": result}


@api.delete("/admin/team/{email}")
async def admin_remove(email: str, admin: dict = Depends(owner_dep)):
    email = email.strip().lower()
    rx = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    r = await db.users.update_many({"email": rx, "role": "admin", **IN_ENV}, {"$set": {"role": DEFAULT_ROLE}})
    i = await db.admin_invites.delete_one({"email": email})
    if not r.modified_count and not i.deleted_count:
        raise HTTPException(404, "No helper admin with that email")
    await log_action(admin, "removed admin", email)
    return {"ok": True}


class PricingIn(BaseModel):
    pro_price: int = Field(ge=49, le=100_000)
    pro_days: int = Field(ge=7, le=365)
    fee_pct: int = Field(ge=0, le=50)
    free_contacts: int = Field(ge=0, le=50)


@api.get("/admin/pricing")
async def admin_pricing(_: dict = Depends(admin_dep)):
    return await pricing()


@api.put("/admin/pricing")
async def admin_set_pricing(body: PricingIn, admin: dict = Depends(owner_dep)):
    old = await pricing()
    new = body.model_dump()
    await db.settings.update_one({"_id": "pricing"}, {"$set": new}, upsert=True)
    changes = ", ".join(f"{k.replace('_', ' ')} {old[k]} → {v}" for k, v in new.items() if old.get(k) != v)
    await log_action(admin, "changed prices", "Pricing", changes or "no change")
    return new


def _day(s: str) -> str:
    return (s or "")[:10]


@api.get("/admin/growth")
async def admin_growth(days: int = Query(30, ge=7, le=365), _: dict = Depends(admin_dep)):
    start = (now() - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    s = start.isoformat()
    series = {(start + timedelta(days=i)).date().isoformat(): {"users": 0, "creators": 0, "businesses": 0, "deals": 0, "earnings": 0}
              for i in range(days)}

    async def bump(col, q, field, key, value=lambda d: 1):
        async for d in db[col].find({**q, field: {"$gte": s}}, {"_id": 0}):
            if _day(d.get(field)) in series:
                series[_day(d[field])][key] += value(d)
    await bump("users", dict(IN_ENV), "created_at", "users")
    await bump("creators", {"is_sample": {"$ne": True}}, "created_at", "creators")
    await bump("businesses", {}, "created_at", "businesses")
    await bump("deals", {"status": {"$ne": "chat"}}, "created_at", "deals")
    await bump("payments", {"status": "paid", "refund_status": {"$ne": "refunded"}}, "paid_at", "earnings",
               lambda p: p["fee"] if p["kind"] == "deal" else p["amount"])
    return [{"date": k, **v} for k, v in series.items()]


FUNNEL = [("Visited the site", lambda p: True), ("Opened sign in / sign up", lambda p: p.startswith("Sign")),
          ("Entered the app", lambda p: not p.startswith(("Landing", "Sign"))), ("Viewed a creator profile", lambda p: p == "Creator profile"),
          ("Started a profile setup", lambda p: p.startswith(("Creator setup", "Business setup"))),
          ("Opened a chat or deal", lambda p: p == "Chat room")]


@api.get("/admin/journey")
async def admin_journey(range: Literal["today", "7d", "30d", "all"] = "7d", _: dict = Depends(admin_dep)):
    s = since_of(range)
    sessions: dict = {}
    async for e in db.events.find({"at": {"$gte": s}} if s else {}, {"_id": 0}).sort("at", 1).limit(100_000):
        sessions.setdefault(e["session_id"], []).append(e)
    pages: dict = {}
    for evs in sessions.values():
        seen = set()
        for i, e in enumerate(evs):
            p = pages.setdefault(e["page"], {"page": e["page"], "views": 0, "sessions": 0, "exits": 0, "secs": 0, "timed": 0})
            p["views"] += 1
            if e["page"] not in seen:
                seen.add(e["page"])
                p["sessions"] += 1
            if i + 1 < len(evs):
                gap = (datetime.fromisoformat(evs[i + 1]["at"]) - datetime.fromisoformat(e["at"])).total_seconds()
                if gap < 1800:
                    p["secs"] += gap
                    p["timed"] += 1
            else:
                p["exits"] += 1
    rows = [{"page": p["page"], "views": p["views"], "sessions": p["sessions"], "exits": p["exits"],
             "exit_rate": round(100 * p["exits"] / p["sessions"]) if p["sessions"] else 0,
             "avg_seconds": round(p["secs"] / p["timed"]) if p["timed"] else None} for p in pages.values()]
    funnel = [{"step": name, "sessions": sum(1 for evs in sessions.values() if any(test(e["page"]) for e in evs))} for name, test in FUNNEL]
    users_q = {**IN_ENV, **({"created_at": {"$gte": s}} if s else {})}
    new_users = [u["user_id"] for u in await db.users.find(users_q, {"user_id": 1}).to_list(50000)]
    with_profile = set(await db.creators.distinct("user_id", {"user_id": {"$in": new_users}})) | \
        set(await db.businesses.distinct("user_id", {"user_id": {"$in": new_users}}))
    contacted = set(await db.deals.distinct("business_id", {"business_id": {"$in": new_users}}))
    paid = set(await db.deals.distinct("business_id", {"business_id": {"$in": new_users}, "paid_at": {"$exists": True}}))
    accounts = [{"step": "Signed up", "users": len(new_users)}, {"step": "Created a creator or business profile", "users": len(with_profile)},
                {"step": "Business contacted a creator", "users": len(contacted)}, {"step": "Business paid for a deal", "users": len(paid)}]
    return {"sessions": len(sessions), "funnel": funnel, "accounts": accounts,
            "pages": sorted(rows, key=lambda r: -r["exits"])[:40]}


@api.get("/admin/log")
async def admin_activity(_: dict = Depends(admin_dep)):
    return await db.admin_log.find({}, {"_id": 0}).sort("at", -1).to_list(300)


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    owner = os.environ.get("OWNER_EMAIL", "").strip().lower()
    if owner:
        owner_rx = {"$regex": f"^{re.escape(owner)}$", "$options": "i"}
        await db.users.update_many({"role": "owner", "email": {"$not": owner_rx}}, {"$set": {"role": "admin"}})
        await db.users.update_many({"email": owner_rx}, {"$set": {"role": "owner"}, "$unset": {"blocked": ""}})
    await db.creators.update_many({"status": "hidden"}, {"$set": {"status": "rejected"}})
    await db.reports.create_index([("reporter_id", 1), ("target_type", 1), ("target_id", 1), ("kind", 1)], unique=True)
    await db.payouts.create_index("deal_id", unique=True)
    await db.admin_invites.create_index("email", unique=True)
    await db.profile_views.create_index([("creator_id", 1), ("viewer_id", 1), ("day", 1)], unique=True)
    await db.events.create_index("at")
    async for d in db.deals.find({"payout_status": "ready"}, {"_id": 0, "id": 1}):
        await release_payout(d["id"])
    if not await db.creators.find_one({"is_sample": True}):
        await db.creators.insert_many(sample_creator_docs())
    await db.creators.update_many({"is_sample": True}, {"$set": {"rating_avg": 0, "rating_count": 0, "deals_done": 0}})
    for col in (db.creators, db.businesses):
        await col.update_many({"live": {"$exists": False}}, {"$set": {"live": True}})
    async for d in db.creators.find({"plans": {"$exists": False}}, {"_id": 0}):
        d.setdefault("categories", [d.get("category", "Other")])
        p = with_plans(d)
        await db.creators.update_one({"user_id": d["user_id"]}, {"$set": {k: p[k] for k in ("categories", "plans", "from_plan", "from_price", "category")}})
    async for d in db.businesses.find({"need_plans": {"$exists": False}}, {"_id": 0, "user_id": 1, "need_plan": 1}):
        await db.businesses.update_one({"user_id": d["user_id"]}, {"$set": {"need_plans": [d.get("need_plan") or "per_video"]}})
    await db.jobs.create_index("id", unique=True)
    await db.interests.create_index([("job_id", 1), ("creator_id", 1)], unique=True)
    for col in (db.creators, db.businesses):
        async for d in col.find({"loc": {"$exists": False}}, {"_id": 0, "user_id": 1, "city": 1, "state": 1}):
            g = with_geo({"city": d.get("city", ""), "state": d.get("state", "")})
            await col.update_one({"user_id": d["user_id"]}, {"$set": g})
        await col.create_index([("loc", "2dsphere")])
    await db.creators.create_index("user_id", unique=True)
    await db.deals.create_index("id", unique=True)
    await db.messages.create_index("deal_id")
    await db.notifications.create_index("user_id")


app.include_router(api)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
