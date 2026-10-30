# UI setup for iteration 4: approved creator + business profile, no deals; mint sign-in tickets. Cleanup: python tests/ui_setup_iter4.py clean
import sys
sys.path.insert(0, "/app/backend/tests")
from pathlib import Path
import test_iter4_chat_pricing_growth as t4
from clerk_helper import sign_in_ticket

t4.full_cleanup()
if len(sys.argv) > 1 and sys.argv[1] == "clean":
    print("cleaned")
    sys.exit(0)
t4.setup_profiles()
t4.mdb.creators.delete_many({"user_id": {"$in": t4.FAKE}})
for who in ("admin", "brand", "creator"):
    Path(f"/tmp/ticket_{who}").write_text(sign_in_ticket(who))
print("ready")
