# Iteration 3: Admin panel (access, stats, approvals, reports, deal/payout flow, disputes, block, content removal, team, log)
# Run serially: python -m pytest tests/test_admin_panel.py -n 0 -v
import os
import time

import pytest
import requests
from pymongo import MongoClient

from clerk_helper import USERS, session_token  # loads backend/.env + frontend/.env

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mdb = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
ADMIN, BRAND, CREATOR = USERS["admin"], USERS["brand"], USERS["creator"]
S = {}  # shared state across ordered tests
WORKFLOW_ENABLED = requests.get(BASE + "/config", timeout=30).json().get("deal_workflow_enabled", True)


def tok(who, fresh=False):
    if fresh or who not in S.get("tok", {}):
        S.setdefault("tok", {})[who] = session_token(who)
    return S["tok"][who]


def call(method, path, who=None, **kw):
    h = {"Authorization": f"Bearer {tok(who)}"} if who else {}
    return requests.request(method, BASE + path, headers=h, timeout=30, **kw)


CREATOR_BODY = {"name": "TEST Admin Creator", "photo": "data:image/png;base64,TESTPHOTO", "city": "Pune", "state": "Maharashtra",
                "categories": ["Fashion"], "gender": "Female", "languages": ["English"], "bio": "TEST bio", "rate_per_video": 1000}
BIZ_BODY = {"company": "TEST Admin Biz", "industry": "Retail", "city": "Pune", "state": "Maharashtra", "need_plans": ["per_video"],
            "budget": "5k-20k", "description": "TEST"}


def cleanup():
    ids = [BRAND, CREATOR]
    deal_ids = [d["id"] for d in mdb.deals.find({"$or": [{"business_id": {"$in": ids}}, {"creator_id": {"$in": ids}}]}, {"id": 1})]
    job_ids = [j["id"] for j in mdb.jobs.find({"business_id": {"$in": ids}}, {"id": 1})]
    mdb.messages.delete_many({"deal_id": {"$in": deal_ids}})
    mdb.payouts.delete_many({"deal_id": {"$in": deal_ids}})
    mdb.deals.delete_many({"id": {"$in": deal_ids}})
    mdb.payments.delete_many({"user_id": {"$in": ids}})
    mdb.interests.delete_many({"job_id": {"$in": job_ids}})
    mdb.jobs.delete_many({"id": {"$in": job_ids}})
    mdb.reports.delete_many({"$or": [{"reporter_id": {"$in": ids + [ADMIN]}}, {"target_user_id": {"$in": ids + [ADMIN]}}]})
    mdb.notifications.delete_many({"user_id": {"$in": ids + [ADMIN]}})
    mdb.creators.delete_many({"user_id": {"$in": ids}})
    mdb.businesses.delete_many({"user_id": {"$in": ids}})
    mdb.saved.delete_many({"user_id": {"$in": ids}})
    mdb.admin_invites.delete_many({"email": {"$regex": "^test_"}})
    mdb.admin_log.delete_many({"admin_id": ADMIN})
    mdb.users.update_many({"user_id": {"$in": ids}}, {"$set": {"role": "member", "active_mode": None, "pro_until": None, "payout_upi": ""},
                                                      "$unset": {"blocked": "", "block_reason": "", "blocked_at": "", "blocked_by": ""}})
    mdb.users.update_one({"user_id": ADMIN}, {"$set": {"role": "admin"}, "$unset": {"blocked": ""}})


@pytest.fixture(scope="module", autouse=True)
def lifecycle():
    cleanup()
    yield
    if not os.environ.get("KEEP_ADMIN_TEST_DATA"):
        cleanup()


if __name__ == "__main__":  # python tests/test_admin_panel.py -> cleanup only
    cleanup()
    print("cleaned")


def new_paid_deal(price=2000):
    d = call("POST", "/deals", "brand", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST brief for video",
                                              "start_date": "2026-02-10", "price": price})
    assert d.status_code == 200, d.text
    did = d.json()["id"]
    assert call("POST", f"/deals/{did}/action", "creator", json={"action": "accept"}).json()["status"] == "accepted"
    o = call("POST", "/payments/order", "brand", json={"kind": "deal", "deal_id": did})
    assert o.status_code == 200 and o.json()["mode"] == "test", o.text
    assert call("POST", "/payments/verify", "brand", json={"payment_id": o.json()["payment_id"]}).status_code == 200
    g = call("GET", f"/deals/{did}", "brand").json()
    assert g["status"] == "paid" and g["payout_status"] == "held"
    return did


# ---------- access ----------
def test_access_control():
    assert call("GET", "/admin/stats").status_code == 401
    r = call("GET", "/admin/stats", "brand")
    assert r.status_code == 403
    for p in ("/admin/stats", "/admin/users", "/admin/reports", "/admin/deals", "/admin/log", "/admin/jobs", "/admin/posts", "/admin/creators"):
        assert call("GET", p, "admin").status_code == 200, p
        assert call("GET", p, "brand").status_code == 403, p
    assert call("GET", "/admin/team", "admin").status_code == 403
    assert call("POST", "/admin/team", "admin", json={"email": "test_x@example.com"}).status_code == 403
    assert call("DELETE", "/admin/team/test_x@example.com", "admin").status_code == 403


def test_owner_team_endpoints():
    mdb.users.update_one({"user_id": ADMIN}, {"$set": {"role": "owner"}})
    try:
        # owner must also reach normal admin endpoints
        assert call("GET", "/admin/stats", "admin").status_code == 200
        t = call("GET", "/admin/team", "admin")
        assert t.status_code == 200 and "admins" in t.json() and "invites" in t.json()
        r = call("POST", "/admin/team", "admin", json={"email": "test_invite_iter3@example.com"})
        assert r.status_code == 200 and r.json()["result"] == "invited"
        assert any(i["email"] == "test_invite_iter3@example.com" for i in call("GET", "/admin/team", "admin").json()["invites"])
        assert call("POST", "/admin/team", "admin", json={"email": "bad-email"}).status_code == 422
        # existing user -> admin
        brand_email = mdb.users.find_one({"user_id": BRAND})["email"]
        r = call("POST", "/admin/team", "admin", json={"email": brand_email})
        assert r.status_code == 200 and r.json()["result"] == "added"
        assert mdb.users.find_one({"user_id": BRAND})["role"] == "admin"
        assert call("GET", "/admin/stats", "brand").status_code == 200
        assert call("POST", "/admin/team", "admin", json={"email": brand_email}).status_code == 400
        assert call("DELETE", f"/admin/team/{brand_email}", "admin").status_code == 200
        assert mdb.users.find_one({"user_id": BRAND})["role"] == "member"
        assert call("DELETE", "/admin/team/test_invite_iter3@example.com", "admin").status_code == 200
        assert call("DELETE", "/admin/team/test_none_iter3@example.com", "admin").status_code == 404
    finally:
        mdb.users.update_one({"user_id": ADMIN}, {"$set": {"role": "admin"}})
        mdb.users.update_one({"user_id": BRAND}, {"$set": {"role": "member"}})


def test_stats_ranges():
    for rng in ("today", "7d", "30d", "all"):
        r = call("GET", f"/admin/stats?range={rng}", "admin")
        assert r.status_code == 200
        d = r.json()
        for k in ("users", "creators_live", "businesses", "open_jobs", "active_deals", "paid_by_businesses", "platform_earnings", "paid_out"):
            assert isinstance(d[k], int), k
        assert set(d["attention"]) == {"pending_creators", "open_reports", "disputes", "failed_payouts"}
        assert d["money_mode"] == "test"
    assert call("GET", "/admin/stats?range=bad", "admin").status_code == 422


# ---------- approvals ----------
def test_creator_approvals():
    r = call("PUT", "/creators/me", "creator", json=CREATOR_BODY)
    assert r.status_code == 200 and r.json()["status"] == "pending"
    assert any(c["user_id"] == CREATOR for c in call("GET", "/admin/creators?status=pending", "admin").json())
    assert call("PATCH", f"/admin/creators/{CREATOR}", "admin", json={"status": "rejected"}).status_code == 400
    assert call("PATCH", f"/admin/creators/{CREATOR}", "admin", json={"status": "rejected", "reason": "TEST blurry photo"}).status_code == 200
    me = call("GET", "/me", "creator").json()
    assert me["creator"]["status"] == "rejected" and me["creator"]["review_note"] == "TEST blurry photo"
    assert any("TEST blurry photo" in n["text"] for n in call("GET", "/notifications", "creator").json())
    assert all(c["user_id"] != CREATOR for c in call("GET", "/creators").json())
    assert call("PATCH", f"/admin/creators/{CREATOR}", "admin", json={"status": "approved"}).status_code == 200
    assert any(c["user_id"] == CREATOR for c in call("GET", "/creators").json())
    assert call("PATCH", "/admin/creators/nope", "admin", json={"status": "approved"}).status_code == 404


def test_business_setup_pro():
    assert call("PUT", "/businesses/me", "brand", json=BIZ_BODY).status_code == 200
    o = call("POST", "/payments/order", "brand", json={"kind": "pro"})
    assert o.status_code == 400 and o.json()["detail"] == "Subscriptions are not available"
    j = call("POST", "/jobs", "brand", json={"title": "TEST Admin job", "description": "TEST job description long", "plans": ["per_video"], "budget": "5k-20k"})
    assert j.status_code == 200
    S["job"] = j.json()["id"]


# ---------- reports ----------
def test_file_reports():
    r = call("POST", "/reports", "brand", json={"target_type": "creator", "target_id": CREATOR, "reason": "fake_profile", "note": "TEST note"})
    assert r.status_code == 200
    assert call("POST", "/reports", "brand", json={"target_type": "creator", "target_id": CREATOR, "reason": "scam"}).status_code == 409
    assert call("POST", "/reports", "creator", json={"target_type": "creator", "target_id": CREATOR, "reason": "other"}).status_code == 400
    assert call("POST", "/reports", "creator", json={"target_type": "business", "target_id": BRAND, "reason": "scam"}).status_code == 200
    assert call("POST", "/reports", "creator", json={"target_type": "job", "target_id": S["job"], "reason": "inappropriate"}).status_code == 200
    assert call("POST", "/reports", "creator", json={"target_type": "job", "target_id": "nope", "reason": "other"}).status_code == 404
    assert call("POST", "/reports", "creator", json={"target_type": "creator", "target_id": CREATOR, "reason": "bad"}).status_code == 422
    assert call("POST", "/reports", json={"target_type": "creator", "target_id": CREATOR, "reason": "other"}).status_code == 401
    # deal report with messages
    d = call("POST", "/deals", "brand", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST brief report deal",
                                              "start_date": "2026-02-10", "price": 1500}).json()
    S["deal_report"] = d["id"]
    assert call("POST", f"/deals/{d['id']}/messages", "creator", json={"text": "TEST hello"}).status_code == 200
    assert call("POST", "/reports", "brand", json={"target_type": "deal", "target_id": d["id"], "reason": "no_show"}).status_code == 200
    reps = call("GET", "/admin/reports?status=open", "admin").json()
    mine = {r["target_type"]: r for r in reps if r["reporter_id"] in (BRAND, CREATOR)}
    assert set(mine) >= {"creator", "business", "job", "deal"}
    S["reports"] = {k: v["id"] for k, v in mine.items()}
    det = call("GET", f"/admin/reports/{S['reports']['deal']}", "admin").json()
    assert det["target"]["id"] == d["id"] and any(m["text"] == "TEST hello" for m in det["messages"])
    assert det["target_user"]["user_id"] == CREATOR
    assert call("GET", "/admin/reports/nope", "admin").status_code == 404


def test_resolve_reports():
    rid = S["reports"]
    assert call("POST", f"/admin/reports/{rid['creator']}/resolve", "admin", json={"action": "release", "note": "TEST"}).status_code == 400
    assert call("POST", f"/admin/reports/{rid['creator']}/resolve", "admin", json={"action": "warn", "note": "TEST be careful"}).status_code == 200
    assert any("TEST be careful" in n["text"] for n in call("GET", "/notifications", "creator").json())
    assert call("POST", f"/admin/reports/{rid['business']}/resolve", "admin", json={"action": "dismiss", "note": "TEST fine"}).status_code == 200
    assert call("POST", f"/admin/reports/{rid['deal']}/resolve", "admin", json={"action": "remove", "note": "TEST nope"}).status_code == 400
    assert call("POST", f"/admin/reports/{rid['deal']}/resolve", "admin", json={"action": "dismiss", "note": "TEST ok"}).status_code == 200
    assert call("POST", f"/admin/reports/{rid['job']}/resolve", "admin", json={"action": "remove", "note": "TEST spam job"}).status_code == 200
    assert mdb.jobs.find_one({"id": S["job"]})["status"] == "removed"
    assert all(j["id"] != S["job"] for j in call("GET", "/jobs", "creator").json())
    assert call("POST", f"/admin/reports/{rid['job']}/resolve", "admin", json={"action": "dismiss", "note": "TEST again"}).status_code == 404
    resolved = call("GET", "/admin/reports?status=resolved", "admin").json()
    assert any(r["id"] == rid["creator"] and r["resolution"]["action"] == "warn" for r in resolved)
    assert any("reviewed your report" in n["text"] for n in call("GET", "/notifications", "brand").json())


# ---------- deals & payouts ----------
@pytest.mark.skipif(not WORKFLOW_ENABLED, reason="deal payments are temporarily disabled")
def test_payout_failed_then_admin_retry():
    did = new_paid_deal(2000)
    assert call("POST", f"/deals/{did}/action", "brand", json={"action": "mark_delivered"}).status_code == 400  # no work yet
    assert call("POST", f"/deals/{did}/action", "creator", json={"action": "submit_work", "link": "https://example.com/v"}).status_code == 200
    r = call("POST", f"/deals/{did}/action", "brand", json={"action": "mark_delivered"})
    assert r.status_code == 200 and r.json()["payout_status"] == "failed" and r.json()["status"] == "delivered"
    assert any("payout UPI" in n["text"] for n in call("GET", "/notifications", "creator").json())
    assert call("GET", "/admin/stats", "admin").json()["attention"]["failed_payouts"] >= 1
    assert call("POST", f"/admin/deals/{did}/retry-payout", "admin").status_code == 400
    mdb.users.update_one({"user_id": CREATOR}, {"$set": {"payout_upi": "test@upi"}})
    assert call("POST", f"/admin/deals/{did}/retry-payout", "admin").status_code == 200
    g = call("GET", f"/deals/{did}", "brand").json()
    assert g["status"] == "completed" and g["payout_status"] == "released" and g["payout_amount"] == 1800
    row = next(d for d in call("GET", "/admin/deals", "admin").json() if d["id"] == did)
    assert row["payout"]["status"] == "released" and row["payout"]["attempts"] == 3
    assert call("POST", f"/admin/deals/{did}/retry-payout", "admin").status_code == 400


@pytest.mark.skipif(not WORKFLOW_ENABLED, reason="deal payments are temporarily disabled")
def test_payout_auto_release_on_upi_save():
    mdb.users.update_one({"user_id": CREATOR}, {"$set": {"payout_upi": ""}})
    did = new_paid_deal(3000)
    call("POST", f"/deals/{did}/action", "creator", json={"action": "submit_work", "link": "https://example.com/v2"})
    assert call("POST", f"/deals/{did}/action", "brand", json={"action": "mark_delivered"}).json()["payout_status"] == "failed"
    assert call("PATCH", "/me", "creator", json={"payout_upi": "creator@upi"}).status_code == 200
    g = call("GET", f"/deals/{did}", "creator").json()
    assert g["status"] == "completed" and g["payout_status"] == "released"


@pytest.mark.skipif(not WORKFLOW_ENABLED, reason="deal payments are temporarily disabled")
def test_payout_released_directly_with_upi():
    did = new_paid_deal(1000)
    call("POST", f"/deals/{did}/action", "creator", json={"action": "submit_work", "link": "https://example.com/v3"})
    r = call("POST", f"/deals/{did}/action", "brand", json={"action": "mark_delivered"}).json()
    assert r["status"] == "completed" and r["payout_status"] == "released"


@pytest.mark.skipif(not WORKFLOW_ENABLED, reason="deal payments are temporarily disabled")
def test_dispute_release_and_refund():
    d1 = new_paid_deal(2500)
    assert call("POST", f"/deals/{d1}/action", "brand", json={"action": "dispute"}).status_code == 400
    assert call("POST", f"/deals/{d1}/action", "creator", json={"action": "dispute", "note": "TEST"}).status_code == 400
    r = call("POST", f"/deals/{d1}/action", "brand", json={"action": "dispute", "note": "TEST late work"})
    assert r.status_code == 200 and r.json()["status"] == "disputed" and r.json()["payout_status"] == "on_hold"
    disp = [x for x in call("GET", "/admin/reports?kind=dispute", "admin").json() if x["target_id"] == d1]
    assert len(disp) == 1
    rid = disp[0]["id"]
    assert call("POST", f"/admin/reports/{rid}/resolve", "admin", json={"action": "warn", "note": "TEST"}).status_code == 400
    assert call("POST", f"/admin/reports/{rid}/resolve", "admin", json={"action": "release", "note": "TEST work ok"}).status_code == 200
    g = call("GET", f"/deals/{d1}", "brand").json()
    assert g["status"] == "completed" and g["payout_status"] == "released"
    d2 = new_paid_deal(1200)
    call("POST", f"/deals/{d2}/action", "brand", json={"action": "dispute", "note": "TEST no show"})
    rid2 = next(x["id"] for x in call("GET", "/admin/reports?kind=dispute", "admin").json() if x["target_id"] == d2)
    before = call("GET", "/admin/stats", "admin").json()["paid_by_businesses"]
    assert call("POST", f"/admin/reports/{rid2}/resolve", "admin", json={"action": "refund", "note": "TEST refund"}).status_code == 200
    g = call("GET", f"/deals/{d2}", "brand").json()
    assert g["status"] == "refunded" and g["payout_status"] == "refunded"
    assert mdb.payments.find_one({"deal_id": d2})["refund_status"] == "refunded"
    assert call("GET", "/admin/stats", "admin").json()["paid_by_businesses"] == before - 1200


# ---------- block ----------
def test_helper_cannot_block_admins():
    assert call("POST", f"/admin/users/{ADMIN}/block", "admin", json={"reason": "TEST self"}).status_code == 400
    mdb.users.update_one({"user_id": BRAND}, {"$set": {"role": "admin"}})
    try:
        assert call("POST", f"/admin/users/{BRAND}/block", "admin", json={"reason": "TEST helper"}).status_code == 403
        mdb.users.update_one({"user_id": BRAND}, {"$set": {"role": "owner"}})
        assert call("POST", f"/admin/users/{BRAND}/block", "admin", json={"reason": "TEST owner"}).status_code == 403
    finally:
        mdb.users.update_one({"user_id": BRAND}, {"$set": {"role": "member"}})
    assert call("POST", f"/admin/users/{CREATOR}/block", "admin", json={"reason": "x"}).status_code == 422


def test_block_and_unblock_creator():
    pend = call("POST", "/deals", "brand", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST brief block deal",
                                                 "start_date": "2026-02-10", "price": 1100}).json()["id"]
    assert call("POST", f"/admin/users/{CREATOR}/block", "admin", json={"reason": "TEST fake account"}).status_code == 200
    r = call("GET", "/me", "creator", )
    assert r.status_code in (401, 403)
    if r.status_code == 403:
        assert r.json()["detail"] == "account_blocked"
    fresh = requests.get(BASE + "/me", headers={"Authorization": f"Bearer {tok('creator', fresh=True)}"}, timeout=30)
    assert fresh.status_code == 403 and fresh.json()["detail"] == "account_blocked"
    assert all(c["user_id"] != CREATOR for c in call("GET", "/creators").json())
    assert call("GET", f"/creators/{CREATOR}").status_code == 404
    assert call("GET", f"/deals/{pend}", "brand").json()["paused"] is True
    assert call("POST", f"/deals/{pend}/messages", "brand", json={"text": "TEST hi"}).status_code == 400
    assert call("POST", f"/deals/{pend}/action", "brand", json={"action": "cancel"}).status_code == 409
    u = call("GET", f"/admin/users/{CREATOR}", "admin").json()
    assert u["user"]["blocked"] is True and u["user"]["block_reason"] == "TEST fake account"
    assert any(x["user_id"] == CREATOR for x in call("GET", "/admin/users?status=blocked", "admin").json())
    assert call("POST", f"/admin/users/{CREATOR}/unblock", "admin", json={"reason": "TEST appeal ok"}).status_code == 200
    assert requests.get(BASE + "/me", headers={"Authorization": f"Bearer {tok('creator', fresh=True)}"}, timeout=30).status_code == 200
    assert any(c["user_id"] == CREATOR for c in call("GET", "/creators").json())
    assert not call("GET", f"/deals/{pend}", "brand").json().get("paused")


def test_users_search_filters():
    email = mdb.users.find_one({"user_id": CREATOR})["email"]
    r = call("GET", "/admin/users", "admin", params={"q": email.split('@')[0]}).json()
    assert any(x["user_id"] == CREATOR and x["kind"] == "creator" for x in r)
    assert any(x["user_id"] == BRAND for x in call("GET", "/admin/users?pro=yes", "admin").json())
    assert all(x["kind"] == "business" for x in call("GET", "/admin/users?role=business", "admin").json())
    d = call("GET", f"/admin/users/{BRAND}", "admin").json()
    assert d["business"]["company"] == "TEST Admin Biz" and len(d["deals"]) >= 1 and len(d["payments"]) >= 1
    assert call("GET", "/admin/users/nope", "admin").status_code == 404


# ---------- content ----------
def test_job_and_post_removal():
    j = call("POST", "/jobs", "brand", json={"title": "TEST Admin job 2", "description": "TEST job description long", "plans": ["per_video"], "budget": "5k-20k"}).json()
    assert call("POST", f"/admin/jobs/{j['id']}/remove", "admin", json={"reason": "TEST off-platform"}).status_code == 200
    assert mdb.jobs.find_one({"id": j["id"]})["status"] == "removed"
    assert any("off-platform" in n["text"] for n in call("GET", "/notifications", "brand").json())
    assert call("POST", "/admin/jobs/nope/remove", "admin", json={"reason": "TEST"}).status_code == 404
    posts = ["data:image/png;base64,TESTPOSTAAAA", "https://example.com/TESTPOSTB"]
    assert call("PUT", "/creators/me/posts", "creator", json={"posts": posts}).status_code == 200
    ap = [p for p in call("GET", "/admin/posts", "admin").json() if p["creator_id"] == CREATOR]
    assert len(ap) == 2
    assert call("POST", "/admin/posts/remove", "admin", json={"creator_id": CREATOR, "index": 1, "prefix": "wrong", "reason": "TEST"}).status_code == 409
    assert call("POST", "/admin/posts/remove", "admin", json={"creator_id": CREATOR, "index": 0, "prefix": ap[0]["prefix"], "reason": "TEST nsfw"}).status_code == 200
    assert mdb.creators.find_one({"user_id": CREATOR})["samples"] == ["https://example.com/TESTPOSTB"]


def test_activity_log():
    log = call("GET", "/admin/log", "admin").json()
    acts = {x["action"] for x in log if x["admin_id"] == ADMIN}
    assert {"rejected", "approved", "blocked", "unblocked", "removed", "retried payout"} <= acts
    assert any(a.startswith("resolved") for a in acts)


# ---------- extra edge cases (iteration 3 code review) ----------
def test_blocked_business_hidden_everywhere():
    j = call("POST", "/jobs", "brand", json={"title": "TEST Admin job 3", "description": "TEST job description long", "plans": ["per_video"], "budget": "5k-20k"}).json()
    call("POST", f"/saved/{BRAND}?kind=business", "creator")
    assert call("POST", f"/admin/users/{BRAND}/block", "admin", json={"reason": "TEST biz block"}).status_code == 200
    try:
        assert all(x["id"] != j["id"] for x in call("GET", "/jobs", "creator").json())
        assert call("GET", f"/businesses/{BRAND}", "creator").status_code == 404
        assert all(b["user_id"] != BRAND for b in call("GET", "/saved", "creator").json()["businesses"])
        assert call("POST", f"/jobs/{j['id']}/interest", "creator", json={"note": ""}).status_code == 404
    finally:
        assert call("POST", f"/admin/users/{BRAND}/unblock", "admin", json={"reason": "TEST biz unblock"}).status_code == 200
        tok("brand", fresh=True)
    assert any(x["id"] == j["id"] for x in call("GET", "/jobs", "creator").json())


def test_admin_message_not_attributed_to_creator():
    d = call("POST", "/deals", "brand", json={"creator_id": CREATOR, "plan": "per_video", "brief": "TEST brief admin msg",
                                              "start_date": "2026-02-10", "price": 1300}).json()
    r = call("POST", f"/deals/{d['id']}/messages", "admin", json={"text": "TEST admin injected"})
    # admins are not deal parties: should be rejected (403/404) or clearly labelled as the team
    assert r.status_code in (403, 404) or r.json().get("sender_name") not in (d["creator_name"], d["business_name"]), r.text


@pytest.mark.skipif(not WORKFLOW_ENABLED, reason="deal payments are temporarily disabled")
def test_concurrent_mark_delivered_no_500():
    from concurrent.futures import ThreadPoolExecutor
    did = new_paid_deal(1400)
    call("POST", f"/deals/{did}/action", "creator", json={"action": "submit_work", "link": "https://example.com/v9"})
    with ThreadPoolExecutor(4) as ex:
        codes = list(ex.map(lambda _: call("POST", f"/deals/{did}/action", "brand", json={"action": "mark_delivered"}).status_code, range(4)))
    assert 500 not in codes, codes
    assert mdb.payouts.count_documents({"deal_id": did}) == 1
    assert mdb.creators.find_one({"user_id": CREATOR})["deals_done"] >= 1
