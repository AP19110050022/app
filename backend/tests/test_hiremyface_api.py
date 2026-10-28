# HireMyFace API regression: auth/roles, profiles, offers & free limit, Pro upgrade, deal lifecycle, chat masking, admin, notifications
# NOTE: ordered stateful flow - run serially: pytest tests/test_hiremyface_api.py -n 0
import os
import sys
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient

sys.path.insert(0, str(Path(__file__).parent))
from clerk_helper import USERS, session_token  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
BRAND, CREATOR, ADMIN = USERS["brand"], USERS["creator"], USERS["admin"]


@pytest.fixture(scope="module")
def db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def tok():
    return {k: session_token(k) for k in ("brand", "creator", "admin")}


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module", autouse=True)
def reset_state(db):
    # Reset the 3 test users to a known baseline (allowed per request)
    deal_ids = [d["id"] for d in db.deals.find({"$or": [{"business_id": BRAND}, {"creator_id": CREATOR}]}, {"id": 1})]
    db.messages.delete_many({"deal_id": {"$in": deal_ids}})
    db.deals.delete_many({"id": {"$in": deal_ids}})
    db.payments.delete_many({"user_id": {"$in": [BRAND, CREATOR]}})
    db.creators.delete_many({"user_id": CREATOR})
    db.users.update_one({"user_id": BRAND}, {"$set": {"pro_until": None}})
    db.users.update_one({"user_id": CREATOR}, {"$set": {"active_mode": None}})
    db.notifications.delete_many({"user_id": {"$in": [BRAND, CREATOR]}})
    yield


ST = {}


# --- auth / roles
class TestAuth:
    def test_public_endpoints(self):
        assert requests.get(f"{API}/").status_code == 200
        cfg = requests.get(f"{API}/config").json()
        assert cfg["payments_mode"] == "test" and cfg["pro_price"] == 999 and cfg["free_offer_limit"] == 2
        cr = requests.get(f"{API}/creators").json()
        assert len([c for c in cr if c["user_id"].startswith("sample_")]) == 8
        assert all("phone" not in c for c in cr)

    @pytest.mark.parametrize("path", ["/me", "/deals", "/notifications", "/saved", "/admin/stats"])
    def test_protected_401(self, path):
        assert requests.get(f"{API}{path}").status_code == 401
        assert requests.get(f"{API}{path}", headers=H("bad.token.x")).status_code == 401

    def test_me_200(self, tok):
        r = requests.get(f"{API}/me", headers=H(tok["brand"]))
        assert r.status_code == 200 and r.json()["user"]["email"] == "brand+clerk_test@example.com"

    def test_member_admin_403_and_admin_200(self, tok):
        for p in ["/admin/stats", "/admin/creators", "/admin/deals", "/admin/payments", "/users"]:
            assert requests.get(f"{API}{p}", headers=H(tok["brand"])).status_code == 403, p
            assert requests.get(f"{API}{p}", headers=H(tok["admin"])).status_code == 200, p


# --- profiles
class TestProfiles:
    def test_business_profile(self, tok):
        body = {"company": "TEST_Chai Point Cafe", "industry": "Restaurant & cafe", "city": "Bengaluru",
                "need_plans": ["per_video"], "budget": "₹5k–20k", "languages": ["Hindi"], "phone": "9999999999"}
        r = requests.put(f"{API}/businesses/me", json=body, headers=H(tok["brand"]))
        assert r.status_code == 200 and r.json()["company"] == "TEST_Chai Point Cafe"
        assert requests.get(f"{API}/me", headers=H(tok["brand"])).json()["business"]["city"] == "Bengaluru"

    def test_creator_profile_pending(self, tok):
        body = {"name": "TEST_Creator Tester", "photo": "https://images.unsplash.com/photo-1", "city": "Mumbai",
                "categories": ["Food"], "gender": "Female", "languages": ["Hindi", "English"], "bio": "hi",
                "phone": "9876543210", "rate_per_video": 1500, "rate_part_time": 15000, "rate_full_time": 40000}
        r = requests.put(f"{API}/creators/me", json=body, headers=H(tok["creator"]))
        assert r.status_code == 200 and r.json()["status"] == "pending"
        assert requests.get(f"{API}/creators/{CREATOR}").status_code == 404
        assert requests.get(f"{API}/me", headers=H(tok["creator"])).json()["user"]["active_mode"] == "creator"

    def test_invalid_creator_payload_422(self, tok):
        r = requests.put(f"{API}/creators/me", json={"name": "x"}, headers=H(tok["creator"]))
        assert r.status_code == 422

    def test_offer_to_pending_creator_404(self, tok):
        r = requests.post(f"{API}/deals", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST_ brief text",
                                                 "start_date": "2026-12-01", "price": 1500}, headers=H(tok["brand"]))
        assert r.status_code == 404

    def test_admin_approve(self, tok):
        pend = requests.get(f"{API}/admin/creators?status=pending", headers=H(tok["admin"])).json()
        assert any(c["user_id"] == CREATOR for c in pend)
        r = requests.patch(f"{API}/admin/creators/{CREATOR}", json={"status": "approved"}, headers=H(tok["admin"]))
        assert r.status_code == 200
        c = requests.get(f"{API}/creators/{CREATOR}").json()
        assert c["status"] == "approved" and "phone" not in c

    def test_me_patch(self, tok):
        assert requests.patch(f"{API}/me", json={"payout_upi": "test@upi"}, headers=H(tok["creator"])).status_code == 200
        assert requests.get(f"{API}/me", headers=H(tok["creator"])).json()["user"]["payout_upi"] == "test@upi"
        assert requests.patch(f"{API}/me", json={"active_mode": "business"}, headers=H(tok["creator"])).status_code == 400


# --- offers + free limit + pro
class TestOffers:
    def test_free_limit(self, tok):
        mk = lambda cid: requests.post(f"{API}/deals", json={"creator_id": cid, "plan": "per_video", "brief": "TEST_ reel for cafe",
                                                             "start_date": "2026-12-01", "price": 2000}, headers=H(tok["brand"]))
        r1 = mk(CREATOR)
        assert r1.status_code == 200 and r1.json()["status"] == "pending"
        ST["deal"] = r1.json()["id"]
        r2 = mk("sample_1")
        assert r2.status_code == 200
        ST["sample_deal"] = r2.json()["id"]
        r3 = mk("sample_2")
        assert r3.status_code == 402 and "Free plan" in r3.json()["detail"]

    def test_brief_validation(self, tok):
        r = requests.post(f"{API}/deals", json={"creator_id": "sample_1", "plan": "per_video", "brief": "short",
                                                 "start_date": "2026-12-01", "price": 2000}, headers=H(tok["brand"]))
        assert r.status_code == 422

    def test_other_user_cannot_read_deal(self, tok):
        assert requests.get(f"{API}/deals/{ST['sample_deal']}", headers=H(tok["creator"])).status_code == 404
        assert requests.get(f"{API}/deals/{ST['sample_deal']}/messages", headers=H(tok["creator"])).status_code == 404

    def test_chat_locked_for_free(self, tok):
        d = requests.get(f"{API}/deals/{ST['deal']}", headers=H(tok["brand"])).json()
        assert d["chat_open"] is False
        r = requests.post(f"{API}/deals/{ST['deal']}/messages", json={"text": "hi"}, headers=H(tok["brand"]))
        assert r.status_code == 402

    def test_upgrade_pro(self, tok):
        o = requests.post(f"{API}/payments/order", json={"kind": "pro"}, headers=H(tok["brand"]))
        assert o.status_code == 200 and o.json()["mode"] == "test" and o.json()["amount"] == 99900
        # another user can't verify brand's payment
        assert requests.post(f"{API}/payments/verify", json={"payment_id": o.json()["payment_id"]}, headers=H(tok["creator"])).status_code == 404
        v = requests.post(f"{API}/payments/verify", json={"payment_id": o.json()["payment_id"]}, headers=H(tok["brand"]))
        assert v.status_code == 200
        assert requests.get(f"{API}/me", headers=H(tok["brand"])).json()["is_pro"] is True


# --- deal lifecycle with masking
class TestDealFlow:
    def test_masked_before_pay(self, tok):
        r = requests.post(f"{API}/deals/{ST['deal']}/messages", json={"text": "call 98765 43210 or a@b.com www.x.com"}, headers=H(tok["brand"]))
        assert r.status_code == 200 and "[hidden until payment]" in r.json()["text"] and "98765" not in r.json()["text"]
        msgs = requests.get(f"{API}/deals/{ST['deal']}/messages", headers=H(tok["creator"])).json()
        assert "a@b.com" not in msgs[-1]["text"]

    def test_counter_and_accept(self, tok):
        assert requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "counter"}, headers=H(tok["creator"])).status_code == 400
        # brand cannot accept its own offer
        assert requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "accept"}, headers=H(tok["brand"])).status_code == 400
        r = requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "counter", "price": 2600}, headers=H(tok["creator"]))
        assert r.status_code == 200 and r.json()["status"] == "countered" and r.json()["counter_price"] == 2600
        r = requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "accept_counter"}, headers=H(tok["brand"]))
        assert r.status_code == 200 and r.json()["status"] == "accepted" and r.json()["price"] == 2600

    def test_pay_deal(self, tok):
        assert requests.post(f"{API}/payments/order", json={"kind": "deal", "deal_id": ST["deal"]}, headers=H(tok["creator"])).status_code == 400
        o = requests.post(f"{API}/payments/order", json={"kind": "deal", "deal_id": ST["deal"]}, headers=H(tok["brand"]))
        assert o.status_code == 200 and o.json()["amount"] == 260000
        assert requests.post(f"{API}/payments/verify", json={"payment_id": o.json()["payment_id"]}, headers=H(tok["brand"])).status_code == 200
        d = requests.get(f"{API}/deals/{ST['deal']}", headers=H(tok["creator"])).json()
        assert d["status"] == "paid" and d["payout_status"] == "held"

    def test_unmasked_after_pay(self, tok):
        msgs = requests.get(f"{API}/deals/{ST['deal']}/messages", headers=H(tok["creator"])).json()
        assert "a@b.com" in msgs[-1]["text"] and "98765 43210" in msgs[-1]["text"]

    def test_deliver_release_rate(self, tok):
        assert requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "mark_delivered"}, headers=H(tok["brand"])).status_code == 400
        assert requests.post(f"{API}/admin/deals/{ST['deal']}/release", headers=H(tok["admin"])).status_code == 400
        r = requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "submit_work", "link": "https://instagram.com/p/test"}, headers=H(tok["creator"]))
        assert r.status_code == 200 and r.json()["delivery_link"]
        r = requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "mark_delivered"}, headers=H(tok["brand"]))
        assert r.status_code == 200 and r.json()["status"] == "delivered" and r.json()["payout_status"] == "ready"
        assert requests.post(f"{API}/admin/deals/{ST['deal']}/release", headers=H(tok["brand"])).status_code == 403
        r = requests.post(f"{API}/admin/deals/{ST['deal']}/release", headers=H(tok["admin"]))
        assert r.status_code == 200 and r.json()["payout"] == 2340
        d = requests.get(f"{API}/deals/{ST['deal']}", headers=H(tok["brand"])).json()
        assert d["status"] == "completed" and d["payout_status"] == "released"
        r = requests.post(f"{API}/deals/{ST['deal']}/rate", json={"stars": 5, "review": "TEST_ great"}, headers=H(tok["brand"]))
        assert r.status_code == 200
        assert requests.post(f"{API}/deals/{ST['deal']}/rate", json={"stars": 4}, headers=H(tok["brand"])).status_code == 400
        c = requests.get(f"{API}/creators/{CREATOR}").json()
        assert c["rating_avg"] == 5 and c["rating_count"] == 1 and c["deals_done"] == 1
        assert c["reviews"][0]["rating"]["stars"] == 5

    def test_admin_stats(self, tok):
        s = requests.get(f"{API}/admin/stats", headers=H(tok["admin"])).json()
        assert s["gmv"] >= 2600 and s["revenue"] >= 999 + 260


# --- notifications
class TestNotifications:
    def test_list_and_read(self, tok):
        n = requests.get(f"{API}/notifications", headers=H(tok["creator"])).json()
        kinds = {x["kind"] for x in n}
        assert {"offer", "approval", "payment", "payout", "rating"} <= kinds
        assert requests.get(f"{API}/me", headers=H(tok["creator"])).json()["unread_notifications"] > 0
        assert requests.post(f"{API}/notifications/read", headers=H(tok["creator"])).status_code == 200
        assert requests.get(f"{API}/me", headers=H(tok["creator"])).json()["unread_notifications"] == 0
