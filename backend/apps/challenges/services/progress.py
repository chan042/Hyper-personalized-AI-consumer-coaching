"""챌린지 progress 초기화 및 공통 진행률 계산 헬퍼"""
import random
from datetime import timedelta

from apps.challenges.constants import (
    COMPARE_TYPE_NEXT_MONTH_CATEGORY,
    CONDITION_TYPE_AMOUNT_RANGE,
)
from apps.challenges.services.lifecycle import (
    get_challenge_end_date,
    get_challenge_start_date,
    resolve_reference_date,
)


def get_elapsed_challenge_days(user_challenge, reference=None):
    """기준일까지 끝난 챌린지 진행 일수.

    오늘은 아직 완료되지 않은 날이므로 전일(어제)까지만 카운트한다.
    단, 챌린지 종료일(end_date) 이후에 호출되면 종료일까지 포함한다.
    """
    start_date = get_challenge_start_date(user_challenge)
    if not start_date:
        return 0

    current_date = resolve_reference_date(reference)
    end_bound = get_challenge_end_date(user_challenge) or current_date
    finished_date = min(current_date - timedelta(days=1), end_bound)
    if finished_date < start_date:
        return 0

    return (finished_date - start_date).days + 1


def get_elapsed_day_progress_fields(user_challenge, reference=None, force_percentage=None):
    """진행률 공통 필드 계산"""
    total_days = max(0, int(getattr(user_challenge, "duration_days", 0) or 0))
    elapsed_days = get_elapsed_challenge_days(user_challenge, reference=reference)
    if total_days > 0:
        elapsed_days = min(elapsed_days, total_days)
        percentage = round((elapsed_days / total_days) * 100, 1)
    else:
        percentage = 0

    if force_percentage is not None:
        percentage = max(0, min(100, round(float(force_percentage), 1)))

    return {
        "elapsed_days": elapsed_days,
        "percentage": percentage,
    }


def merge_elapsed_day_progress(progress, user_challenge, reference=None, force_percentage=None):
    """기존 progress에 공통 진행률 필드를 병합"""
    merged = dict(progress or {})
    merged.update(
        get_elapsed_day_progress_fields(
            user_challenge,
            reference=reference,
            force_percentage=force_percentage,
        )
    )
    return merged


def _build_progress_base(progress_type):
    return {
        "type": progress_type,
        "elapsed_days": 0,
        "percentage": 0,
        "is_on_track": True,
    }


def build_initial_progress(
    *,
    progress_type,
    duration_days,
    success_conditions=None,
    user_input_values=None,
    photo_frequency=None,
    compare_base=0,
    random_budget=None,
):
    success_conditions = success_conditions or {}
    user_input_values = user_input_values or {}
    duration_days = int(duration_days or 0)

    if progress_type == "amount":
        target = user_input_values.get("target_amount") or success_conditions.get("target_amount", 0)
        progress = {
            **_build_progress_base("amount"),
            "current": 0,
            "target": target,
            "remaining": target,
        }
        if success_conditions.get("type") == CONDITION_TYPE_AMOUNT_RANGE and target:
            tolerance_percent = success_conditions.get("tolerance_percent", 10)
            progress["lower_limit"] = int(target * (1 - tolerance_percent / 100))
            progress["upper_limit"] = int(target * (1 + tolerance_percent / 100))
        return progress

    if progress_type == "zero_spend":
        return {
            **_build_progress_base("zero_spend"),
            "current": 0,
            "target_categories": success_conditions.get("categories", []),
            "is_violated": False,
            "violation_amount": 0,
            "total_days": duration_days,
        }

    if progress_type == "daily_check":
        return {
            **_build_progress_base("daily_check"),
            "checked_days": 0,
            "total_days": duration_days,
            "daily_status": [],
        }

    if progress_type == "photo":
        mode = photo_frequency or "once"
        required_count = duration_days if photo_frequency == "daily" else 1
        if mode == "on_purchase":
            required_count = 0
        return {
            **_build_progress_base("photo"),
            "photo_count": 0,
            "required_count": required_count,
            "photos": [],
            "mode": mode,
        }

    if progress_type == "compare":
        progress = {
            **_build_progress_base("compare"),
            "current": 0,
            "compare_base": compare_base,
            "target": compare_base,
            "compare_label": success_conditions.get("compare_label", "비교 기준"),
            "difference": 0,
        }
        if success_conditions.get("compare_type") == COMPARE_TYPE_NEXT_MONTH_CATEGORY:
            progress.update(
                {
                    "phase": "this_month",
                    "this_month_spent": compare_base,
                    "next_month_spent": 0,
                }
            )
        return progress

    if progress_type == "daily_rule":
        return {
            **_build_progress_base("daily_rule"),
            "daily_status": [],
            "passed_days": 0,
            "total_days": duration_days,
            "has_violation": False,
            "daily_rules": success_conditions.get("daily_rules", {}),
        }

    if progress_type == "random_budget":
        budget = int(random_budget or random.randint(30000, 100000))
        return {
            **_build_progress_base("random_budget"),
            "current": 0,
            "target": budget,
            "remaining": budget,
            "potential_points": int(budget * 0.08),
            "jackpot_eligible": False,
            "difference_percent": 100,
            "mask_target": True,
        }

    if progress_type == "custom":
        target = success_conditions.get("target_amount", 0)
        progress = {
            **_build_progress_base("custom"),
            "current": 0,
            "checked_conditions": [],
        }
        if target:
            progress["target"] = target
            progress["remaining"] = target
        return progress

    return _build_progress_base(progress_type)


def build_initial_progress_for_template(
    template,
    *,
    user_input_values=None,
    success_conditions=None,
    compare_base=0,
    random_budget=None,
):
    display_config = template.display_config or {}
    return build_initial_progress(
        progress_type=display_config.get("progress_type", "amount"),
        duration_days=template.duration_days,
        success_conditions=success_conditions or template.success_conditions,
        user_input_values=user_input_values or {},
        photo_frequency=template.photo_frequency,
        compare_base=compare_base,
        random_budget=random_budget,
    )


def build_initial_progress_for_user_challenge(user_challenge, *, random_budget=None):
    display_config = user_challenge.display_config or {}
    success_conditions = user_challenge.success_conditions or {}
    system_generated_values = user_challenge.system_generated_values or {}

    return build_initial_progress(
        progress_type=display_config.get("progress_type", "amount"),
        duration_days=user_challenge.duration_days,
        success_conditions=success_conditions,
        user_input_values=user_challenge.user_input_values or {},
        photo_frequency=user_challenge.photo_frequency,
        compare_base=success_conditions.get("compare_base", 0),
        random_budget=random_budget or system_generated_values.get("random_budget"),
    )
