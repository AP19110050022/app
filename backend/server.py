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
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:  # launched as `backend.server` (the default)
    from backend.clerk_auth import clerk_router, require_user
    from backend.seed import sample_creator_docs
except ModuleNotFoundError:  # launched from inside backend/ as `server`
    from clerk_auth import clerk_router, require_user
    from seed import sample_creator_docs

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("hiremyface")

PRO_PRICE = 999
PRO_DAYS = 30
FEE_PCT = 10
FREE_OFFER_LIMIT = 2
PLANS = ("per_video", "part_time", "full_time")
PlanT = Literal["per_video", "part_time", "full_time"]
PAID_STATES = ("paid", "delivered", "completed")


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso() -> str:
    return now().isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- roles (code-defined) ----------
ROLES = ["admin", "member"]
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


def _profile_from_clerk(data: dict) -> dict:
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    emails = data.get("email_addresses") or []
    is_admin = any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified" for e in emails)
    primary = next((e["email_address"] for e in emails if e.get("id") == data.get("primary_email_address_id")),
                   emails[0]["email_address"] if emails else "")
    name = " ".join(x for x in [data.get("first_name"), data.get("last_name")] if x) or primary.split("@")[0]
    return {"role": "admin" if is_admin else DEFAULT_ROLE, "email": primary, "name": name, "image_url": data.get("image_url", "")}


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        prof = _profile_from_clerk(await run_in_threadpool(_clerk_user, uid))
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": prof["role"]}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "active_mode": None, "pro_until": None, "payout_upi": "",
                              "created_at": iso(), **prof}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
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


async def notify(user_id: str, kind: str, text: str, link: str = ""):
    if user_id.startswith("sample_"):
        return
    await db.notifications.insert_one({"id": new_id(), "user_id": user_id, "kind": kind, "text": text,
                                       "link": link, "read": False, "created_at": iso()})


# ---------- models ----------
class CreatorIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    photo: str = Field(min_length=5, max_length=900_000)
    city: str = Field(min_length=2, max_length=60)
    category: str = Field(min_length=2, max_length=40)
    gender: Literal["Female", "Male", "Other"]
    languages: List[str] = Field(min_length=1, max_length=8)
    bio: str = Field("", max_length=500)
    intro_video: str = Field("", max_length=500)
    samples: List[str] = Field(default_factory=list, max_length=6)
    instagram: str = Field("", max_length=200)
    youtube: str = Field("", max_length=200)
    followers: int = Field(0, ge=0)
    phone: str = Field("", max_length=20)
    rate_per_video: int = Field(ge=100, le=10_000_000)
    rate_part_time: int = Field(ge=500, le=10_000_000)
    rate_full_time: int = Field(ge=500, le=10_000_000)


class BusinessIn(BaseModel):
    company: str = Field(min_length=2, max_length=80)
    logo: str = Field("", max_length=900_000)
    industry: str = Field(min_length=2, max_length=40)
    city: str = Field(min_length=2, max_length=60)
    website: str = Field("", max_length=200)
    phone: str = Field("", max_length=20)
    need_plan: PlanT
    budget: str = Field(min_length=1, max_length=40)
    languages: List[str] = Field(default_factory=list, max_length=8)


class MeUpdate(BaseModel):
    active_mode: Optional[Literal["creator", "business"]] = None
    payout_upi: Optional[str] = Field(None, max_length=80)


class OfferIn(BaseModel):
    creator_id: str
    plan: PlanT
    brief: str = Field(min_length=10, max_length=1500)
    start_date: str = Field(min_length=8, max_length=20)
    price: int = Field(ge=100, le=10_000_000)


class DealAction(BaseModel):
    action: Literal["accept", "decline", "counter", "accept_counter", "cancel", "submit_work", "mark_delivered"]
    price: Optional[int] = Field(None, ge=100, le=10_000_000)
    link: Optional[str] = Field(None, max_length=500)


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


class CreatorStatusIn(BaseModel):
    status: Literal["approved", "hidden", "pending"]


class RoleIn(BaseModel):
    role: str


# ---------- helpers ----------
def rzp_client():
    kid, sec = os.environ.get("RAZORPAY_KEY_ID"), os.environ.get("RAZORPAY_KEY_SECRET")
    return razorpay.Client(auth=(kid, sec)) if kid and sec else None


CONTACT_RE = re.compile(
    r"([\w.+-]+@[\w-]+\.[\w.]+)|(\+?\d[\d\s().-]{7,}\d)|(https?://\S+)|(www\.\S+)|(\b[\w-]+\.(com|in|net|org|io|me|co)\b\S*)",
    re.IGNORECASE)


def mask(text: str) -> str:
    return CONTACT_RE.sub("[hidden until payment]", text)


def public_creator(c: dict) -> dict:
    c = {k: v for k, v in c.items() if k not in ("phone",)}
    return c


async def get_deal_for(deal_id: str, member: dict) -> dict:
    scope = {} if member["role"] == "admin" else {"$or": [{"business_id": member["user_id"]}, {"creator_id": member["user_id"]}]}
    deal = await db.deals.find_one({"id": deal_id, **scope}, {"_id": 0})
    if not deal:
        raise HTTPException(404, "Deal not found")
    return deal


async def mark_payment_done(pay: dict, gateway_payment_id: str):
    if pay["status"] == "paid":
        return
    await db.payments.update_one({"id": pay["id"]}, {"$set": {"status": "paid", "gateway_payment_id": gateway_payment_id, "paid_at": iso()}})
    if pay["kind"] == "pro":
        user = await db.users.find_one({"user_id": pay["user_id"]}, {"_id": 0})
        base = now()
        if user and user.get("pro_until") and datetime.fromisoformat(user["pro_until"]) > base:
            base = datetime.fromisoformat(user["pro_until"])
        await db.users.update_one({"user_id": pay["user_id"]}, {"$set": {"pro_until": (base + timedelta(days=PRO_DAYS)).isoformat()}})
        await notify(pay["user_id"], "payment", "Business Pro is active. Chat and in-app payments are unlocked.", "/app/profile")
    else:
        deal = await db.deals.find_one({"id": pay["deal_id"]}, {"_id": 0})
        await db.deals.update_one({"id": pay["deal_id"]}, {"$set": {"status": "paid", "paid_at": iso(), "payout_status": "held"},
                                                           "$push": {"history": {"status": "paid", "at": iso()}}})
        await notify(deal["creator_id"], "payment", f"Payment received and held for '{deal['plan_label']}'. Start the work!", f"/app/chat/{deal['id']}")
        await notify(deal["business_id"], "payment", "Payment successful. The money is held safely until you approve the work.", f"/app/chat/{deal['id']}")


PLAN_LABEL = {"per_video": "Per Video", "part_time": "Part-time", "full_time": "Full-time"}
RATE_FIELD = {"per_video": "rate_per_video", "part_time": "rate_part_time", "full_time": "rate_full_time"}


# ---------- public ----------
@api.get("/")
async def root():
    return {"message": "HireMyFace API"}


@api.get("/config")
async def config():
    return {"payments_mode": "razorpay" if rzp_client() else "test", "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
            "pro_price": PRO_PRICE, "pro_days": PRO_DAYS, "fee_pct": FEE_PCT, "free_offer_limit": FREE_OFFER_LIMIT}


@api.get("/creators")
async def list_creators(q: str = "", category: str = "", city: str = "", language: str = "", plan: str = "",
                        gender: str = "", min_price: int = 0, max_price: int = 0, sort: str = "recommended", limit: int = 60):
    query = {"status": "approved"}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"city": rx}, {"category": rx}, {"bio": rx}]
    if category:
        query["category"] = category
    if city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    if language:
        query["languages"] = language
    if gender:
        query["gender"] = gender
    field = RATE_FIELD.get(plan, "rate_per_video")
    if min_price or max_price:
        query[field] = {**({"$gte": min_price} if min_price else {}), **({"$lte": max_price} if max_price else {})}
    order = {"price_asc": [(field, 1)], "price_desc": [(field, -1)], "newest": [("created_at", -1)],
             "rating": [("rating_avg", -1)]}.get(sort, [("rating_avg", -1), ("rating_count", -1)])
    docs = await db.creators.find(query, {"_id": 0, "phone": 0, "samples": 0}).sort(order).to_list(min(limit, 100))
    return docs


@api.get("/creators/{creator_id}")
async def get_creator(creator_id: str):
    c = await db.creators.find_one({"user_id": creator_id, "status": "approved"}, {"_id": 0, "phone": 0})
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
    month_start = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    offers_this_month = await db.deals.count_documents({"business_id": uid, "created_at": {"$gte": month_start}})
    return {"user": member, "creator": creator, "business": business, "is_pro": is_pro(member),
            "unread_notifications": unread, "offers_this_month": offers_this_month}


@api.patch("/me")
async def update_me(body: MeUpdate, member: dict = Depends(current_member)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd.get("active_mode") == "creator" and not await db.creators.find_one({"user_id": member["user_id"]}):
        raise HTTPException(400, "Create your creator profile first")
    if upd.get("active_mode") == "business" and not await db.businesses.find_one({"user_id": member["user_id"]}):
        raise HTTPException(400, "Create your business profile first")
    if upd:
        await db.users.update_one({"user_id": member["user_id"]}, {"$set": upd})
    return {"ok": True}


@api.delete("/me")
async def delete_me(member: dict = Depends(current_member)):
    uid = member["user_id"]
    for col in ("creators", "businesses", "saved", "notifications"):
        await db[col].delete_many({"user_id": uid})
    await db.users.delete_one({"user_id": uid})
    return {"ok": True}


@api.put("/creators/me")
async def upsert_creator(body: CreatorIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    existing = await db.creators.find_one({"user_id": uid}, {"_id": 0})
    data = body.model_dump()
    if existing:
        await db.creators.update_one({"user_id": uid}, {"$set": {**data, "updated_at": iso()}})
    else:
        await db.creators.insert_one({**data, "user_id": uid, "status": "pending", "rating_avg": 0, "rating_count": 0,
                                      "deals_done": 0, "created_at": iso()})
        await db.users.update_one({"user_id": uid}, {"$set": {"active_mode": "creator"}})
        await notify(uid, "approval", "Your creator profile is submitted. It goes live once our team approves it.", "/app/profile")
    return await db.creators.find_one({"user_id": uid}, {"_id": 0})


@api.put("/businesses/me")
async def upsert_business(body: BusinessIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    existing = await db.businesses.find_one({"user_id": uid})
    await db.businesses.update_one({"user_id": uid}, {"$set": {**body.model_dump(), "updated_at": iso()},
                                                     "$setOnInsert": {"user_id": uid, "created_at": iso()}}, upsert=True)
    if not existing:
        await db.users.update_one({"user_id": uid}, {"$set": {"active_mode": "business"}})
    return await db.businesses.find_one({"user_id": uid}, {"_id": 0})


# ---------- saved ----------
@api.get("/businesses")
async def list_businesses(_: dict = Depends(current_member)):
    return await db.businesses.find({}, {"_id": 0, "phone": 0}).sort("created_at", -1).to_list(200)


@api.get("/saved")
async def list_saved(member: dict = Depends(current_member)):
    ids = [s["creator_id"] for s in await db.saved.find({"user_id": member["user_id"]}, {"_id": 0}).to_list(500)]
    return await db.creators.find({"user_id": {"$in": ids}, "status": "approved"}, {"_id": 0, "phone": 0, "samples": 0}).to_list(500)


@api.get("/saved/ids")
async def saved_ids(member: dict = Depends(current_member)):
    return [s["creator_id"] for s in await db.saved.find({"user_id": member["user_id"]}, {"_id": 0}).to_list(500)]


@api.post("/saved/{creator_id}")
async def save_creator(creator_id: str, member: dict = Depends(current_member)):
    await db.saved.update_one({"user_id": member["user_id"], "creator_id": creator_id},
                              {"$setOnInsert": {"user_id": member["user_id"], "creator_id": creator_id, "created_at": iso()}}, upsert=True)
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
    creator = await db.creators.find_one({"user_id": body.creator_id, "status": "approved"}, {"_id": 0})
    if not creator:
        raise HTTPException(404, "Creator not found")
    if body.creator_id == uid:
        raise HTTPException(400, "You can't send an offer to yourself")
    if not is_pro(member):
        month_start = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        if await db.deals.count_documents({"business_id": uid, "created_at": {"$gte": month_start}}) >= FREE_OFFER_LIMIT:
            raise HTTPException(402, f"Free plan allows {FREE_OFFER_LIMIT} offers a month. Upgrade to Business Pro for unlimited offers.")
    deal = {"id": new_id(), "business_id": uid, "creator_id": body.creator_id, "business_name": business["company"],
            "business_logo": business.get("logo", ""), "creator_name": creator["name"], "creator_photo": creator["photo"],
            "plan": body.plan, "plan_label": PLAN_LABEL[body.plan], "brief": body.brief, "start_date": body.start_date,
            "price": body.price, "counter_price": None, "status": "pending", "delivery_link": "", "payout_status": None,
            "rating": None, "history": [{"status": "pending", "at": iso()}], "created_at": iso(), "updated_at": iso()}
    await db.deals.insert_one({**deal})
    await notify(body.creator_id, "offer", f"New {deal['plan_label']} offer from {business['company']} for ₹{body.price:,}", f"/app/chat/{deal['id']}")
    return deal


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
    chat_open = bool(biz_user and is_pro(biz_user))
    return {**deal, "chat_open": chat_open, "is_business": deal["business_id"] == member["user_id"],
            "is_creator": deal["creator_id"] == member["user_id"]}


@api.post("/deals/{deal_id}/action")
async def deal_action(deal_id: str, body: DealAction, member: dict = Depends(current_member)):
    deal = await get_deal_for(deal_id, member)
    uid, a, st = member["user_id"], body.action, deal["status"]
    is_b, is_c = deal["business_id"] == uid, deal["creator_id"] == uid
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
        new_status, upd["payout_status"], msg_to = "delivered", "ready", deal["creator_id"]
        msg = f"{deal['business_name']} approved your work. Your payout is being released."
    else:
        raise HTTPException(400, "This action isn't available right now")
    upd["updated_at"] = iso()
    ops = {"$set": upd}
    if new_status:
        upd["status"] = new_status
        ops["$push"] = {"history": {"status": new_status, "at": iso()}}
    await db.deals.update_one({"id": deal_id}, ops)
    if msg_to:
        await notify(msg_to, "deal", msg, f"/app/chat/{deal_id}")
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
    if not (biz_user and is_pro(biz_user)):
        raise HTTPException(402, "Chat unlocks when the business upgrades to Business Pro")
    if deal["status"] in ("declined", "cancelled"):
        raise HTTPException(400, "This deal is closed")
    is_b = deal["business_id"] == member["user_id"]
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
    if body.kind == "pro":
        if not await db.businesses.find_one({"user_id": uid}):
            raise HTTPException(400, "Create your business profile first")
        amount, desc, deal_id = PRO_PRICE, f"Business Pro – {PRO_DAYS} days", None
    else:
        deal = await get_deal_for(body.deal_id or "", member)
        if deal["business_id"] != uid or deal["status"] != "accepted":
            raise HTTPException(400, "This deal can't be paid right now")
        if not is_pro(member):
            raise HTTPException(402, "Upgrade to Business Pro to pay in the app")
        amount, desc, deal_id = deal["price"], f"{deal['plan_label']} – {deal['creator_name']}", deal["id"]
    pay = {"id": new_id(), "user_id": uid, "kind": body.kind, "deal_id": deal_id, "amount": amount, "description": desc,
           "fee": round(amount * FEE_PCT / 100) if body.kind == "deal" else amount, "status": "created", "created_at": iso()}
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
admin_dep = require_role("admin")


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(admin_dep)):
    paid = await db.payments.find({"status": "paid"}, {"_id": 0, "amount": 1, "fee": 1, "kind": 1}).to_list(10000)
    return {"users": await db.users.count_documents(IN_ENV),
            "creators_live": await db.creators.count_documents({"status": "approved", "is_sample": {"$ne": True}}),
            "creators_pending": await db.creators.count_documents({"status": "pending"}),
            "businesses": await db.businesses.count_documents({}),
            "deals": await db.deals.count_documents({}),
            "payouts_ready": await db.deals.count_documents({"payout_status": "ready"}),
            "gmv": sum(p["amount"] for p in paid if p["kind"] == "deal"),
            "revenue": sum(p["fee"] for p in paid),
            "pro_subs": await db.users.count_documents({"pro_until": {"$gt": iso()}})}


@api.get("/admin/creators")
async def admin_creators(status: str = "", _: dict = Depends(admin_dep)):
    q = {"status": status} if status else {}
    return await db.creators.find(q, {"_id": 0, "samples": 0}).sort("created_at", -1).to_list(500)


@api.patch("/admin/creators/{creator_id}")
async def admin_set_creator(creator_id: str, body: CreatorStatusIn, _: dict = Depends(admin_dep)):
    r = await db.creators.update_one({"user_id": creator_id}, {"$set": {"status": body.status}})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    text = {"approved": "Your creator profile is live! Businesses can now find you.",
            "hidden": "Your creator profile was hidden by our team. Contact support for details.",
            "pending": "Your creator profile is back under review."}[body.status]
    await notify(creator_id, "approval", text, "/app/profile")
    return {"ok": True}


@api.get("/admin/deals")
async def admin_deals(_: dict = Depends(admin_dep)):
    return await db.deals.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)


@api.post("/admin/deals/{deal_id}/release")
async def admin_release(deal_id: str, _: dict = Depends(admin_dep)):
    deal = await db.deals.find_one({"id": deal_id, "payout_status": "ready"}, {"_id": 0})
    if not deal:
        raise HTTPException(400, "No payout ready for this deal")
    payout = deal["price"] - round(deal["price"] * FEE_PCT / 100)
    await db.deals.update_one({"id": deal_id}, {"$set": {"status": "completed", "payout_status": "released", "payout_amount": payout,
                                                         "released_at": iso(), "updated_at": iso()},
                                                "$push": {"history": {"status": "completed", "at": iso()}}})
    await db.creators.update_one({"user_id": deal["creator_id"]}, {"$inc": {"deals_done": 1}})
    await notify(deal["creator_id"], "payout", f"Payout of ₹{payout:,} released to your payout account.", f"/app/chat/{deal_id}")
    await notify(deal["business_id"], "deal", f"Deal with {deal['creator_name']} is completed.", f"/app/chat/{deal_id}")
    return {"ok": True, "payout": payout}


@api.get("/admin/payments")
async def admin_payments(_: dict = Depends(admin_dep)):
    return await db.payments.find({"status": "paid"}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/users")
async def list_users(admin: dict = Depends(admin_dep)):
    people = await db.users.find(IN_ENV, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
            "users": [{**p, "role": effective_role(p.get("role")), "is_pro": is_pro(p)} for p in people]}


@api.patch("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(admin_dep)):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(status_code=403, detail="Not allowed")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(status_code=404, detail="Not found")
    if (effective_role(target.get("role")) == "admin" and body.role != "admin"
            and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
        raise HTTPException(status_code=409, detail="Keep at least one admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    if not await db.creators.find_one({"is_sample": True}):
        await db.creators.insert_many(sample_creator_docs())
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
