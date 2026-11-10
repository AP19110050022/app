# Iteration 5: public auth-events ingestion + admin sign-in health metrics
# Run: python -m pytest tests/test_iter5_signin_health.py -n 0 -v
import uuid
from datetime import datetime, timezone

import pytest

from test_admin_panel import call, mdb

SID = "TESTiter5" + uuid.uuid4().hex[:10]
SID2 = "TESTiter5" + uuid.uuid4().hex[:10]
HOST = "test-iter5.example.com"


def cleanup():
    mdb.auth_events.delete_many({"session_id": {"$in": [SID, SID2, "TEST_hc1"]}})


@pytest.fixture(scope="module", autouse=True)
def lifecycle():
    cleanup()
    yield
    cleanup()


# auth-events ingestion
class TestAuthEvents:
    def test_post_valid_kinds(self):
        for kind in ("signin_page", "signed_in", "me_failed", "bounced", "blocked"):
            r = call("POST", "/auth-events", json={"session_id": SID, "kind": kind, "host": HOST})
            assert r.status_code == 200, r.text
            assert r.json() == {"ok": True}
        assert mdb.auth_events.count_documents({"session_id": SID}) == 5

    def test_dedup_same_session_kind(self):
        for _ in range(3):
            assert call("POST", "/auth-events", json={"session_id": SID2, "kind": "me_failed", "host": HOST}).status_code == 200
        assert mdb.auth_events.count_documents({"session_id": SID2, "kind": "me_failed"}) == 1

    @pytest.mark.parametrize("body", [
        {"session_id": "TESTiter5bad", "kind": "hacked", "host": HOST},
        {"session_id": "ab", "kind": "signed_in", "host": HOST},
        {"session_id": "bad id with spaces!", "kind": "signed_in", "host": HOST},
        {"session_id": "TESTiter5bad", "kind": "signed_in", "host": "<script>"},
        {"kind": "signed_in"},
    ])
    def test_invalid_422(self, body):
        assert call("POST", "/auth-events", json=body).status_code == 422
        assert mdb.auth_events.count_documents({"session_id": "TESTiter5bad"}) == 0


# admin sign-in health
class TestSignInHealth:
    def test_no_token_401(self):
        assert call("GET", "/admin/signin-health").status_code == 401

    def test_member_403(self):
        assert call("GET", "/admin/signin-health", "brand").status_code == 403

    @pytest.mark.parametrize("days", [7, 14, 30])
    def test_admin_shape(self, days):
        r = call("GET", "/admin/signin-health", "admin", params={"days": days})
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["days"]) == days
        assert d["days"][-1]["date"] == datetime.now(timezone.utc).date().isoformat()
        for row in d["days"]:
            for k in ("signin_page", "signed_in", "me_failed", "bounced", "blocked", "failed"):
                assert isinstance(row[k], int)
            assert row["failed"] == row["me_failed"] + row["bounced"]
        assert isinstance(d["hosts"], list)
        assert isinstance(d["today_fail_rate"], int) and 0 <= d["today_fail_rate"] <= 100

    def test_counts_reflect_events(self):
        d = call("GET", "/admin/signin-health", "admin", params={"days": 7}).json()
        h = next(x for x in d["hosts"] if x["host"] == HOST)
        assert h["signin_page"] == 1 and h["signed_in"] == 1 and h["me_failed"] == 2 and h["bounced"] == 1 and h["blocked"] == 1
        t = d["days"][-1]
        assert t["me_failed"] >= 2 and t["signed_in"] >= 1
        tries = t["signed_in"] + t["failed"]
        assert d["today_fail_rate"] == round(100 * t["failed"] / tries)

    def test_days_bounds(self):
        assert call("GET", "/admin/signin-health", "admin", params={"days": 0}).status_code == 422
        assert call("GET", "/admin/signin-health", "admin", params={"days": 91}).status_code == 422
