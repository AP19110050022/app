# Helper: mint Clerk session JWTs and sign-in tickets for test users (never prints secrets)
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

CLERK_API = "https://api.clerk.com/v1"
USERS = {
    "admin": "user_3LJwvIsuaWYdTZ3PeXPqnSV2Ed0",
    "brand": "user_3LJwvJ0RdkVnL01m3o2Usirl5xE",
    "creator": "user_3LJwvI2AR0HGqG8TFQnFBVfyehH",
}


def _h():
    return {"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-test"}


def session_token(who: str) -> str:
    r = requests.post(f"{CLERK_API}/sessions", json={"user_id": USERS[who]}, headers=_h(), timeout=20)
    r.raise_for_status()
    sid = r.json()["id"]
    t = requests.post(f"{CLERK_API}/sessions/{sid}/tokens", json={"expires_in_seconds": 3600}, headers=_h(), timeout=20)
    t.raise_for_status()
    return t.json()["jwt"]


def sign_in_ticket(who: str) -> str:
    r = requests.post(f"{CLERK_API}/sign_in_tokens", json={"user_id": USERS[who], "expires_in_seconds": 3600}, headers=_h(), timeout=20)
    r.raise_for_status()
    return r.json()["token"]


if __name__ == "__main__":
    # usage: python clerk_helper.py ticket brand  -> writes /tmp/ticket_brand
    kind, who = sys.argv[1], sys.argv[2]
    val = sign_in_ticket(who) if kind == "ticket" else session_token(who)
    Path(f"/tmp/{kind}_{who}").write_text(val)
    print(f"wrote /tmp/{kind}_{who}")
