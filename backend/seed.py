from datetime import datetime, timezone

U = "https://images.unsplash.com/"
Q = "?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=80&w=800"

SAMPLE_CREATORS = [
    ("Ananya Roy", "photo-1749700332031-cf99864959ea", "Kolkata", "Fashion", "Female", ["English", "Hindi", "Bengali"], 1499, 12000, 32000, 48000),
    ("Rahul Sharma", "photo-1628619487925-e9b8fc4c6b08", "Bengaluru", "Tech", "Male", ["English", "Hindi", "Kannada"], 1999, 15000, 40000, 26000),
    ("Priya Kapoor", "photo-1662850886700-4ec19bd30d11", "Mumbai", "Food", "Female", ["English", "Hindi", "Marathi"], 999, 9000, 25000, 61000),
    ("Vikram Patel", "photo-1598966739654-5e9a252d8c32", "Ahmedabad", "Fitness", "Male", ["English", "Hindi", "Gujarati"], 1299, 10000, 28000, 35000),
    ("Sofia Verma", "photo-1618746647602-1384364ac94b", "Delhi", "Beauty", "Female", ["English", "Hindi"], 2499, 18000, 45000, 92000),
    ("Meera Iyer", "photo-1725033489648-a819750348eb", "Chennai", "Education", "Female", ["English", "Tamil"], 799, 8000, 22000, 14000),
    ("Arjun Rao", "photo-1749353709853-6ed9969b1125", "Hyderabad", "Real estate", "Male", ["English", "Telugu", "Hindi"], 1799, 14000, 38000, 21000),
    ("Kavya Nair", "photo-1595754883593-e274aaa13580", "Kochi", "Beauty", "Female", ["English", "Malayalam"], 1199, 11000, 30000, 40000),
]


def sample_creator_docs():
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, (name, img, city, cat, gender, langs, pv, pt, ft, followers) in enumerate(SAMPLE_CREATORS):
        docs.append({
            "user_id": f"sample_{i + 1}",
            "is_sample": True,
            "status": "approved",
            "name": name,
            "photo": U + img + Q,
            "city": city,
            "category": cat,
            "gender": gender,
            "languages": langs,
            "bio": f"Sample profile. {name} presents {cat.lower()} brands on camera in {', '.join(langs)}.",
            "intro_video": "",
            "samples": [],
            "instagram": "",
            "youtube": "",
            "followers": followers,
            "phone": "",
            "rate_per_video": pv,
            "rate_part_time": pt,
            "rate_full_time": ft,
            "rating_avg": 0,
            "rating_count": 0,
            "deals_done": 0,
            "created_at": now,
        })
    return docs
