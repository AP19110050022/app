# Iteration 2 features: multi-category + plan toggles, sort, visibility, posts, notify prefs, business need_plans, jobs & interests
# Requires the base API regression suite to have run first (approved TEST creator and business). Run serially: -n 0
import os
import sys
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient

sys.path.insert(0, str(Path(__file__).parent))
from clerk_helper import USERS, session_token  # noqa: E402

API = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/") + "/api"
BRAND, CREATOR = USERS["brand"], USERS["creator"]
ST = {}


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def db():
    return MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


@pytest.fixture(scope="module")
def tok():
    return {k: session_token(k) for k in ("brand", "creator")}


@pytest.fixture(scope="module", autouse=True)
def cleanup(db):
    yield
    ids = [j["id"] for j in db.jobs.find({"title": {"$regex": "^TEST_"}}, {"id": 1})]
    db.interests.delete_many({"job_id": {"$in": ids}})
    db.jobs.delete_many({"id": {"$in": ids}})
    db.creators.update_one({"user_id": CREATOR}, {"$set": {"live": True}})
    db.businesses.update_one({"user_id": BRAND}, {"$set": {"live": True}})
    db.users.update_many({"user_id": {"$in": [BRAND, CREATOR]}}, {"$unset": {"notify_prefs": ""}})


def creator_body(db, **kw):
    c = db.creators.find_one({"user_id": CREATOR})
    body = {"name": c["name"], "photo": c["photo"], "city": "Mumbai", "categories": ["Food", "Fashion", "Tech"],
            "gender": "Female", "languages": ["Hindi"], "rate_per_video": None, "rate_part_time": 15000, "rate_full_time": None}
    body.update(kw)
    return body


# --- creator plans & categories
class TestCreatorPlans:
    def test_only_part_time(self, tok, db):
        r = requests.put(f"{API}/creators/me", json=creator_body(db), headers=H(tok["creator"]))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plans"] == ["part_time"] and d["from_plan"] == "part_time" and d["from_price"] == 15000
        assert d["categories"] == ["Food", "Fashion", "Tech"] and d["category"] == "Food"
        assert d["status"] == "approved"

    def test_no_plans_400(self, tok, db):
        r = requests.put(f"{API}/creators/me", json=creator_body(db, rate_part_time=None), headers=H(tok["creator"]))
        assert r.status_code == 400

    def test_five_categories_422(self, tok, db):
        r = requests.put(f"{API}/creators/me", json=creator_body(db, categories=["A", "B", "C", "D", "E"]), headers=H(tok["creator"]))
        assert r.status_code == 422

    def test_deal_for_unoffered_plan_400(self, tok):
        r = requests.post(f"{API}/deals", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST_ brief text here",
                                                 "start_date": "2026-12-01", "price": 1500}, headers=H(tok["brand"]))
        assert r.status_code == 400 and "Per Video" in r.json()["detail"]

    def test_category_filter_multi(self):
        cr = requests.get(f"{API}/creators", params={"category": "Tech"}).json()
        assert any(c["user_id"] == CREATOR for c in cr)


# --- sort
class TestSort:
    def test_price_asc_desc(self):
        a = [c["from_price"] for c in requests.get(f"{API}/creators", params={"sort": "price_asc"}).json()]
        d = [c["from_price"] for c in requests.get(f"{API}/creators", params={"sort": "price_desc"}).json()]
        assert a == sorted(a) and d == sorted(d, reverse=True) and len(a) >= 8

    def test_nearest_with_city(self):
        r = requests.get(f"{API}/creators", params={"sort": "nearest", "city": "Mumbai", "lat": 19.07, "lng": 72.87, "radius_km": 2000}).json()
        dist = [c.get("distance_km", 1e9) for c in r]
        assert dist == sorted(dist) and len(r) > 0


# --- visibility + posts
class TestVisibilityPosts:
    def test_creator_offline_hidden(self, tok):
        assert requests.patch(f"{API}/me/visibility", json={"kind": "creator", "live": False}, headers=H(tok["creator"])).status_code == 200
        assert not any(c["user_id"] == CREATOR for c in requests.get(f"{API}/creators").json())
        assert requests.patch(f"{API}/me/visibility", json={"kind": "creator", "live": True}, headers=H(tok["creator"])).status_code == 200
        assert any(c["user_id"] == CREATOR for c in requests.get(f"{API}/creators").json())

    def test_visibility_no_profile_404(self, tok):
        r = requests.patch(f"{API}/me/visibility", json={"kind": "creator", "live": False}, headers=H(tok["brand"]))
        assert r.status_code == 404

    def test_posts_save(self, tok):
        posts = ["https://images.unsplash.com/photo-TEST1", "https://instagram.com/reel/TEST"]
        assert requests.put(f"{API}/creators/me/posts", json={"posts": posts}, headers=H(tok["creator"])).status_code == 200
        assert requests.get(f"{API}/creators/{CREATOR}").json()["samples"] == posts
        r = requests.put(f"{API}/creators/me/posts", json={"posts": ["x"] * 4}, headers=H(tok["creator"]))
        assert r.status_code == 422


# --- notification prefs
class TestNotifyPrefs:
    def test_messages_off_suppresses(self, tok, db):
        assert requests.patch(f"{API}/me", json={"notify_prefs": {"offers": True, "deals": True, "messages": False}}, headers=H(tok["creator"])).status_code == 200
        assert requests.get(f"{API}/me", headers=H(tok["creator"])).json()["user"]["notify_prefs"]["messages"] is False
        r = requests.post(f"{API}/deals", json={"creator_id": CREATOR, "plan": "part_time", "brief": "TEST_ brief text here",
                                                 "start_date": "2026-12-01", "price": 15000}, headers=H(tok["brand"]))
        assert r.status_code == 200, r.text
        ST["deal"] = r.json()["id"]
        before = db.notifications.count_documents({"user_id": CREATOR, "kind": "message"})
        assert requests.post(f"{API}/deals/{ST['deal']}/messages", json={"text": "hello"}, headers=H(tok["brand"])).status_code == 200
        assert db.notifications.count_documents({"user_id": CREATOR, "kind": "message"}) == before
        assert db.notifications.count_documents({"user_id": CREATOR, "kind": "offer", "link": f"/app/chat/{ST['deal']}"}) == 1
        assert requests.post(f"{API}/deals/{ST['deal']}/action", json={"action": "cancel"}, headers=H(tok["brand"])).status_code == 409


# --- business need_plans
class TestBusiness:
    def test_need_plans_multi(self, tok):
        body = {"company": "TEST_Chai Point Cafe", "industry": "Restaurant & cafe", "city": "Bengaluru",
                "need_plans": ["per_video", "full_time"], "budget": "₹5k–20k", "description": "TEST_ desc"}
        r = requests.put(f"{API}/businesses/me", json=body, headers=H(tok["brand"]))
        assert r.status_code == 200 and r.json()["need_plans"] == ["per_video", "full_time"] and r.json()["description"] == "TEST_ desc"
        assert requests.put(f"{API}/businesses/me", json={**body, "need_plans": []}, headers=H(tok["brand"])).status_code == 422


# --- jobs & interests
class TestJobs:
    def test_create_job(self, tok):
        r = requests.post(f"{API}/jobs", json={"title": "TEST_Reel presenter", "description": "Need a host for 4 reels",
                                                "plans": ["per_video", "part_time"], "budget": "₹5k–20k"}, headers=H(tok["brand"]))
        assert r.status_code == 200, r.text
        ST["job"] = r.json()["id"]
        assert r.json()["status"] == "open" and r.json()["company"] == "TEST_Chai Point Cafe"

    def test_job_validation(self, tok):
        assert requests.post(f"{API}/jobs", json={"title": "TEST_x", "description": "short", "plans": [], "budget": "1"}, headers=H(tok["brand"])).status_code == 422
        assert requests.get(f"{API}/jobs").status_code == 401

    def test_creator_sees_and_interest(self, tok):
        jobs = requests.get(f"{API}/jobs", headers=H(tok["creator"])).json()
        j = next(j for j in jobs if j["id"] == ST["job"])
        assert j["applied"] is False
        for _ in range(2):
            assert requests.post(f"{API}/jobs/{ST['job']}/interest", json={}, headers=H(tok["creator"])).status_code == 200
        j = next(j for j in requests.get(f"{API}/jobs", headers=H(tok["creator"])).json() if j["id"] == ST["job"])
        assert j["applied"] is True and j["interested"] == 1
        mine = requests.get(f"{API}/interests/mine", headers=H(tok["creator"])).json()
        assert any(i["job_id"] == ST["job"] for i in mine)

    def test_own_job_interest_blocked(self, tok):
        r = requests.post(f"{API}/jobs/{ST['job']}/interest", json={}, headers=H(tok["brand"]))
        assert r.status_code == 400

    def test_business_sees_interest_and_shortlist(self, tok):
        mine = requests.get(f"{API}/jobs/mine", headers=H(tok["brand"])).json()
        j = next(j for j in mine if j["id"] == ST["job"])
        assert len(j["interests"]) == 1 and j["interests"][0]["creator_id"] == CREATOR
        iid = j["interests"][0]["id"]
        for s in ("shortlisted", "offered"):
            assert requests.patch(f"{API}/interests/{iid}", json={"status": s}, headers=H(tok["brand"])).status_code == 200
        assert requests.patch(f"{API}/interests/{iid}", json={"status": "declined"}, headers=H(tok["creator"])).status_code == 404
        assert requests.get(f"{API}/interests/mine", headers=H(tok["creator"])).json()[0]["status"] == "offered"

    def test_business_profile_jobs(self, tok):
        b = requests.get(f"{API}/businesses/{BRAND}", headers=H(tok["creator"])).json()
        assert any(j["id"] == ST["job"] for j in b["jobs"]) and "phone" not in b

    def test_offline_business_hides_jobs(self, tok):
        requests.patch(f"{API}/me/visibility", json={"kind": "business", "live": False}, headers=H(tok["brand"]))
        assert not any(j["id"] == ST["job"] for j in requests.get(f"{API}/jobs", headers=H(tok["creator"])).json())
        requests.patch(f"{API}/me/visibility", json={"kind": "business", "live": True}, headers=H(tok["brand"]))
        assert any(j["id"] == ST["job"] for j in requests.get(f"{API}/jobs", headers=H(tok["creator"])).json())

    def test_pause_close_hides(self, tok):
        base = {"title": "TEST_Reel presenter", "description": "Need a host for 4 reels", "plans": ["per_video"], "budget": "₹5k–20k"}
        for s in ("paused", "closed"):
            r = requests.put(f"{API}/jobs/{ST['job']}", json={**base, "status": s}, headers=H(tok["brand"]))
            assert r.status_code == 200 and r.json()["status"] == s
            assert not any(j["id"] == ST["job"] for j in requests.get(f"{API}/jobs", headers=H(tok["creator"])).json())
        assert requests.post(f"{API}/jobs/{ST['job']}/interest", json={}, headers=H(tok["creator"])).status_code == 404
        assert requests.put(f"{API}/jobs/{ST['job']}", json=base, headers=H(tok["creator"])).status_code == 404

    def test_delete_job(self, tok):
        assert requests.delete(f"{API}/jobs/{ST['job']}", headers=H(tok["creator"])).status_code == 404
        assert requests.delete(f"{API}/jobs/{ST['job']}", headers=H(tok["brand"])).status_code == 200
        assert not any(j["id"] == ST["job"] for j in requests.get(f"{API}/jobs/mine", headers=H(tok["brand"])).json())
        assert not any(i["job_id"] == ST["job"] for i in requests.get(f"{API}/interests/mine", headers=H(tok["creator"])).json())
