# UI setup iteration 5: chat between test brand and test creator + fresh tickets. Cleanup handled by ui_setup_iter4.py clean
import sys
sys.path.insert(0, "/app/backend/tests")
from pathlib import Path
from test_admin_panel import call, CREATOR
from clerk_helper import sign_in_ticket

r = call("POST", "/chats", "brand", json={"creator_id": CREATOR})
print("chat", r.status_code)
did = r.json()["id"]
m = call("POST", f"/deals/{did}/messages", "brand", json={"text": "TEST hello from iter5"})
print("msg", m.status_code, m.text[:120])
Path("/tmp/iter5_deal").write_text(did)
for who in ("admin", "brand"):
    Path(f"/tmp/ticket_{who}").write_text(sign_in_ticket(who))
print("deal", did)
