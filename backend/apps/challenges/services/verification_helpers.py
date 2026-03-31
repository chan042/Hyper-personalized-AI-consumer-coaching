"""챌린지 공통 헬퍼 함수"""
from apps.challenges.constants import CONVENIENCE_STORE_KEYWORDS


def contains_convenience_store_keyword(text: str) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in CONVENIENCE_STORE_KEYWORDS)


def count_verified_photos(log) -> int:
    return sum(1 for photo in (log.photo_urls or []) if photo.get("verified", False))


def sum_convenience_spending(log) -> int:
    spent_by_store = (log.condition_detail or {}).get("spent_by_store", {})
    convenience_spent = 0
    for store_name, amount in spent_by_store.items():
        if contains_convenience_store_keyword(store_name):
            convenience_spent += amount
    return convenience_spent
