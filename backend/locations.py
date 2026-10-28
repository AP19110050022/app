import json
import math
from pathlib import Path

CITIES = json.loads((Path(__file__).parent / "data" / "in_cities.json").read_text(encoding="utf-8"))
_BY_NAME = {}
for _c in CITIES:
    _BY_NAME.setdefault(_c["name"].lower(), _c)
STATES = sorted({c["state"] for c in CITIES})


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def lookup(name: str, state: str = ""):
    n = (name or "").strip().lower()
    if state:
        for c in CITIES:
            if c["name"].lower() == n and c["state"] == state:
                return c
    return _BY_NAME.get(n)


def search(q: str, limit: int = 25):
    q = q.strip().lower()
    if not q:
        return []
    starts = [c for c in CITIES if c["name"].lower().startswith(q)]
    contains = [c for c in CITIES if q in c["name"].lower() and not c["name"].lower().startswith(q)]
    return (starts + contains)[:limit]


def cities_in(state: str, limit: int = 1000):
    return [c for c in CITIES if c["state"] == state][:limit]


def nearest(lat: float, lng: float):
    return min(CITIES, key=lambda c: haversine_km(lat, lng, c["lat"], c["lng"]))
