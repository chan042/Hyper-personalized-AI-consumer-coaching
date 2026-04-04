from typing import Any, List

MENU_OPTION_TOKEN_GROUPS = (
    frozenset({"단품", "세트", "콤보"}),
    frozenset({"라지", "미디엄", "스몰"}),
)
OPTIONAL_SINGLE_OPTION_TOKENS = frozenset({"단품"})

PARSE_ONLY_OPTION_TOKENS = frozenset({"아이스", "핫", "ice", "hot"})

AMBIGUOUS_OPTION_TOKENS = frozenset().union(
    *MENU_OPTION_TOKEN_GROUPS,
    PARSE_ONLY_OPTION_TOKENS,
)


def extract_menu_option_signature(menu_name: Any) -> List[frozenset[str]]:
    normalized_tokens = [token.lower() for token in str(menu_name or "").strip().split() if token]
    signatures: List[frozenset[str]] = []
    for group in MENU_OPTION_TOKEN_GROUPS:
        lowered_group = {token.lower() for token in group}
        matches = frozenset(token for token in normalized_tokens if token in lowered_group)
        signatures.append(matches)
    return signatures


def _normalize_menu_option_signature_for_comparison(
    signature: List[frozenset[str]],
    *,
    allow_optional_single: bool = False,
) -> List[frozenset[str]]:
    normalized_signature = list(signature)
    if allow_optional_single and normalized_signature:
        normalized_signature[0] = frozenset(
            token for token in normalized_signature[0] if token not in OPTIONAL_SINGLE_OPTION_TOKENS
        )
    return normalized_signature


def has_conflicting_menu_option_tokens(
    requested_menu_name: Any,
    observed_menu_name: Any,
    *,
    allow_optional_single: bool = False,
) -> bool:
    requested_signature = extract_menu_option_signature(requested_menu_name)
    observed_signature = extract_menu_option_signature(observed_menu_name)
    requested_signature = _normalize_menu_option_signature_for_comparison(
        requested_signature,
        allow_optional_single=allow_optional_single,
    )
    observed_signature = _normalize_menu_option_signature_for_comparison(
        observed_signature,
        allow_optional_single=allow_optional_single,
    )
    for requested_tokens, observed_tokens in zip(requested_signature, observed_signature):
        if not requested_tokens and not observed_tokens:
            continue
        if requested_tokens != observed_tokens:
            return True
    return False
