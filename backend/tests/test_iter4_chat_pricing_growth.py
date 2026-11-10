# Iteration 4: chat threads, free-contacts limit, profile visits, admin pricing, growth charts, user journey
# Run serially: python -m pytest tests/test_iter4_chat_pricing_growth.py -n 0 -v
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

import test_admin_panel as t
from test_admin_panel import ADMIN, BRAND, CREATOR, BIZ_BODY, CREATOR_BODY, call, mdb

FAKE = [f"TEST_iter4_creator_{i}" for i in range(4)]
SID = "TESTiter4" + uuid.uuid4().hex[:10]
SID2 = "TESTiter4" + uuid.uuid4().hex[:10]


def full_cleanup():
    t.cleanup()
    deal_ids = [d["id"] for d in mdb.deals.find({"creator_id": {"$in": FAKE}}, {"id": 1})]
    mdb.messages.delete_many({"deal_id": {"$in": deal_ids}})
    mdb.deals.delete_many({"id": {"$in": deal_ids}})
    mdb.creators.delete_many({"user_id": {"$in": FAKE}})
    mdb.notifications.delete_many({"user_id": {"$in": FAKE}})
    mdb.profile_views.delete_many({"$or": [{"viewer_id": {"$in": [ADMIN, BRAND, CREATOR]}}, {"creator_id": {"$in": FAKE + [CREATOR]}}]})
    mdb.events.delete_many({"session_id": {"$regex": "^TESTiter4"}})
    mdb.settings.delete_one({"_id": "pricing"})


@pytest.fixture(scope="module", autouse=True)
def lifecycle():
    full_cleanup()
    yield
    if not os.environ.get("KEEP_ITER4_DATA"):
        full_cleanup()


def setup_profiles():
    assert call("PUT", "/creators/me", "creator", json=CREATOR_BODY).status_code == 200
    mdb.creators.update_one({"user_id": CREATOR}, {"$set": {"status": "approved"}})
    assert call("PUT", "/businesses/me", "brand", json=BIZ_BODY).status_code == 200
    base = mdb.creators.find_one({"user_id": CREATOR}, {"_id": 0})
    for i, uid in enumerate(FAKE):
        mdb.creators.insert_one({**base, "user_id": uid, "name": f"TEST Fake Creator {i}", "views": 0})


# ---------- chat threads ----------
def test_chat_thread_and_offer_conversion():
    setup_profiles()
    assert call("POST", "/chats", json={"creator_id": CREATOR}).status_code == 401
    assert call("POST", "/chats", "creator", json={"creator_id": CREATOR}).status_code == 400  # no business profile
    r = call("POST", "/chats", "brand", json={"creator_id": CREATOR})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    assert call("POST", "/chats", "brand", json={"creator_id": CREATOR}).json()["id"] == cid  # same thread
    d = call("GET", f"/deals/{cid}", "brand").json()
    assert d["status"] == "chat" and d["free_chat"] is True and d["chat_open"] is True and d["is_business"] is True
    m = call("POST", f"/deals/{cid}/messages", "brand", json={"text": "TEST hello from brand"})
    assert m.status_code == 200 and m.json()["seen"] is False, m.text
    assert call("POST", f"/deals/{cid}/messages", "creator", json={"text": "TEST hi back"}).status_code == 200
    assert call("POST", f"/deals/{cid}/messages", "admin", json={"text": "TEST admin"}).status_code == 403
    me = call("GET", "/me", "brand").json()
    assert me["contacts_used"] == 1 and me["free_contacts"] == 3
    # actions on a chat thread are rejected
    assert call("POST", f"/deals/{cid}/action", "creator", json={"action": "accept"}).status_code == 409
    # offer converts the same thread
    o = call("POST", "/deals", "brand", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST brief for video",
                                              "start_date": "2026-02-10", "price": 1500})
    assert o.status_code == 200, o.text
    assert o.json()["id"] == cid and o.json()["status"] == "pending"
    msgs = call("GET", f"/deals/{cid}/messages", "creator").json()
    assert [x["text"] for x in msgs] == ["TEST hello from brand", "TEST hi back"]
    assert [x["seen"] for x in msgs] == [True, False]
    msgs = call("GET", f"/deals/{cid}/messages", "brand").json()
    assert [x["seen"] for x in msgs] == [True, True]
    assert call("GET", "/me", "brand").json()["contacts_used"] == 1
    # message on existing active deal returns that deal
    assert call("POST", "/chats", "brand", json={"creator_id": CREATOR}).json()["id"] == cid
    t.S["cid"] = cid


def test_unlimited_contacts_and_chat():
    ids = []
    for uid in FAKE[:2]:
        r = call("POST", "/chats", "brand", json={"creator_id": uid})
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
    assert call("GET", "/me", "brand").json()["contacts_used"] == 3
    r = call("POST", "/chats", "brand", json={"creator_id": FAKE[2]})
    assert r.status_code == 200, r.text
    ids.append(r.json()["id"])
    offer = {"creator_id": FAKE[2], "plan": "per_video", "brief": "TEST brief for video", "start_date": "2026-02-10", "price": 1500}
    assert call("POST", "/deals", "brand", json=offer).status_code == 200
    # existing contacts still allowed
    assert call("POST", "/chats", "brand", json={"creator_id": FAKE[0]}).status_code == 200
    assert call("POST", "/deals", "brand", json={**offer, "creator_id": FAKE[1]}).status_code == 200
    assert call("POST", f"/deals/{ids[0]}/messages", "brand", json={"text": "TEST still ok"}).status_code == 200
    assert call("POST", "/deals", "brand", json={**offer, "creator_id": FAKE[3]}).status_code == 200
    d = call("GET", f"/deals/{ids[-1]}", "brand").json()
    assert d["chat_open"] is True
    assert call("GET", f"/deals/{ids[0]}", "brand").json()["chat_open"] is True


def test_deals_list_contains_chat_status():
    deals = call("GET", "/deals?side=business", "brand").json()
    statuses = {d["status"] for d in deals}
    assert "chat" in statuses  # frontend must filter these from Deals page


# ---------- profile visits ----------
def test_profile_visits():
    before = call("GET", f"/creators/{CREATOR}").json().get("views", 0)
    assert call("POST", f"/creators/{CREATOR}/view").status_code == 401
    assert call("POST", f"/creators/{CREATOR}/view", "brand").status_code == 200
    assert call("POST", f"/creators/{CREATOR}/view", "brand").status_code == 200  # same day, no double count
    assert call("POST", f"/creators/{CREATOR}/view", "creator").status_code == 200  # own profile not counted
    assert call("POST", f"/creators/{CREATOR}/view", "admin").status_code == 200
    after = call("GET", f"/creators/{CREATOR}").json().get("views", 0)
    assert after == before + 2, (before, after)
    r = call("POST", "/creators/TEST_nonexistent_creator/view", "brand")
    print("view nonexistent creator:", r.status_code, mdb.profile_views.count_documents({"creator_id": "TEST_nonexistent_creator"}))
    mdb.profile_views.delete_many({"creator_id": "TEST_nonexistent_creator"})


# ---------- pricing ----------
def test_pricing_admin():
    assert call("GET", "/admin/pricing").status_code == 401
    assert call("GET", "/admin/pricing", "brand").status_code == 403
    g = call("GET", "/admin/pricing", "admin")
    assert g.status_code == 200 and g.json() == {"pro_price": 999, "pro_days": 30, "fee_pct": 10, "free_contacts": 3, "deal_workflow_enabled": False}
    body = {"pro_price": 1499, "pro_days": 60, "fee_pct": 12, "free_contacts": 2}
    assert call("PUT", "/admin/pricing", "admin", json=body).status_code == 403  # helper
    mdb.users.update_one({"user_id": ADMIN}, {"$set": {"role": "owner"}})
    try:
        for bad in ({"pro_price": 48}, {"pro_price": 100001}, {"pro_days": 6}, {"pro_days": 366}, {"fee_pct": -1}, {"fee_pct": 51},
                    {"free_contacts": -1}, {"free_contacts": 51}):
            assert call("PUT", "/admin/pricing", "admin", json={**body, **bad}).status_code == 422, bad
        r = call("PUT", "/admin/pricing", "admin", json=body)
        assert r.status_code == 200 and r.json() == body
        cfg = call("GET", "/config").json()
        assert all(cfg[k] == v for k, v in body.items())
        assert call("GET", "/admin/pricing", "admin").json() == body
        me = call("GET", "/me", "brand").json()
        assert me["free_contacts"] == 2  # brand already used 3+ -> still capped
        log = call("GET", "/admin/log", "admin").json()
        assert any(e["action"] == "changed prices" for e in log)
        # pro order uses new price
        o = call("POST", "/payments/order", "brand", json={"kind": "pro"})
        print("pro order:", o.status_code, o.text[:200])
        if o.status_code == 200:
            pay = mdb.payments.find_one({"id": o.json()["payment_id"]})
            assert pay["amount"] == 1499, pay
        r = call("PUT", "/admin/pricing", "admin", json={"pro_price": 999, "pro_days": 30, "fee_pct": 10, "free_contacts": 3})
        assert r.status_code == 200
    finally:
        mdb.users.update_one({"user_id": ADMIN}, {"$set": {"role": "admin"}})
        mdb.settings.delete_one({"_id": "pricing"})
    assert call("GET", "/config").json()["pro_price"] == 999


# ---------- growth ----------
def test_growth():
    assert call("GET", "/admin/growth", "brand").status_code == 403
    for days in (30, 90, 365):
        r = call("GET", f"/admin/growth?days={days}", "admin")
        assert r.status_code == 200
        s = r.json()
        assert len(s) == days
        assert set(s[0]) == {"date", "users", "creators", "businesses", "deals", "earnings"}
        assert s[-1]["date"] == datetime.now(timezone.utc).date().isoformat()
    today = call("GET", "/admin/growth?days=30", "admin").json()[-1]
    assert today["deals"] >= 3  # test offers created today (chat threads excluded)
    assert today["businesses"] >= 1
    assert call("GET", "/admin/growth?days=3", "admin").status_code == 422
    assert call("GET", "/admin/growth?days=400", "admin").status_code == 422


# ---------- journey ----------
def test_journey():
    assert call("POST", "/track", json={"session_id": "abc", "page": "Landing"}).status_code == 422
    assert call("POST", "/track", json={"session_id": SID, "page": ""}).status_code == 422
    for p in ("Landing", "Sign in", "Discover", "Creator profile", "Chat room"):
        assert call("POST", "/track", json={"session_id": SID, "page": p}).status_code == 200
    for p in ("Landing", "Creator setup · Step 1"):
        assert call("POST", "/track", json={"session_id": SID2, "page": p}).status_code == 200
    assert call("GET", "/admin/journey", "brand").status_code == 403
    for rng in ("today", "7d", "30d", "all"):
        r = call("GET", f"/admin/journey?range={rng}", "admin")
        assert r.status_code == 200, r.text
    j = call("GET", "/admin/journey?range=today", "admin").json()
    assert j["sessions"] >= 2
    f = {x["step"]: x["sessions"] for x in j["funnel"]}
    assert f["Visited the site"] >= 2 and f["Opened a chat or deal"] >= 1 and f["Started a profile setup"] >= 1
    assert [a["step"] for a in j["accounts"]][0] == "Signed up"
    pages = {p["page"]: p for p in j["pages"]}
    assert pages["Chat room"]["exits"] >= 1
    assert pages["Creator setup · Step 1"]["exit_rate"] > 0
    for p in j["pages"]:
        assert set(p) == {"page", "views", "sessions", "exits", "exit_rate", "avg_seconds"}
    assert call("GET", "/admin/journey?range=bad", "admin").status_code == 422
