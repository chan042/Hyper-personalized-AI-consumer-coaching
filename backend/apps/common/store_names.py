from typing import Any, Dict


BRANCH_TOKEN_SUFFIXES = (
    "직영점",
    "드라이브스루점",
    "DT점",
    "호점",
    "점",
)


def _normalize_store_name(store_name: Any) -> str:
    return " ".join(str(store_name or "").strip().split())


def _unwrap_branch_token(token: Any) -> str:
    normalized = str(token or "").strip()
    if normalized.startswith("(") and normalized.endswith(")"):
        normalized = normalized[1:-1].strip()
    return normalized


def _looks_like_branch_token(token: Any) -> bool:
    normalized = _unwrap_branch_token(token)
    if not normalized:
        return False
    return normalized.endswith(BRANCH_TOKEN_SUFFIXES)


def build_store_lookup_names(store_name: Any) -> Dict[str, str]:
    full_store_name = _normalize_store_name(store_name)
    if not full_store_name:
        return {
            "full": "",
            "brand": "",
        }

    tokens = full_store_name.split()
    if len(tokens) >= 2 and _looks_like_branch_token(tokens[-1]):
        brand_store_name = " ".join(tokens[:-1]).strip()
        if brand_store_name:
            return {
                "full": full_store_name,
                "brand": brand_store_name,
            }

    return {
        "full": full_store_name,
        "brand": full_store_name,
    }
