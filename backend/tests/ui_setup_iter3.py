# UI setup for iteration 3: a paid deal for the dispute button, clear old reports, open job, mint tickets
import sys
sys.path.insert(0, "/app/backend/tests")
from pathlib import Path
import test_admin_panel as t
from clerk_helper import sign_in_ticket

t.mdb.reports.delete_many({"reporter_id": {"$in": [t.BRAND, t.CREATOR]}})
t.mdb.creators.update_one({"user_id": t.CREATOR}, {"$set": {"status": "approved"}, "$unset": {"blocked": ""}})
did = t.new_paid_deal(1700)
t.call("POST", f"/deals/{did}/action", "creator", json={"action": "submit_work", "link": "https://example.com/uiwork"})
j = t.call("POST", "/jobs", "brand", json={"title": "TEST UI job", "description": "TEST job for UI report", "plans": ["per_video"], "budget": "5k-20k"}).json()
Path("/tmp/ui_ids").write_text(f"{did}\n{j['id']}\n")
for who in ("admin", "brand", "creator"):
    Path(f"/tmp/ticket_{who}").write_text(sign_in_ticket(who))
print("deal", did, "job", j["id"])
