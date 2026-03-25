import string

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils.crypto import get_random_string

from apps.battles.models import BattleParticipant, BattleProfile, YuntaekBattle


OPEN_BATTLE_STATUSES = [
    YuntaekBattle.Status.REQUESTED,
    YuntaekBattle.Status.ACTIVE,
    YuntaekBattle.Status.WAITING_FOR_SCORE,
]

RESULT_PENDING_STATUSES = [
    YuntaekBattle.Status.COMPLETED,
    YuntaekBattle.Status.DRAW,
]

BATTLE_CODE_CHARS = string.ascii_uppercase + string.digits


def get_battle_display_name(user):
    return (user.username or user.email.split("@")[0] or "").strip()


def _ensure_unique_battle_code(profile):
    if not profile.battle_code or BattleProfile.objects.filter(battle_code=profile.battle_code).exclude(pk=profile.pk).exists():
        return _assign_new_battle_code(profile)
    return profile


def _generate_unique_battle_code(length=8):
    for _ in range(20):
        candidate = get_random_string(length, allowed_chars=BATTLE_CODE_CHARS)
        if not BattleProfile.objects.filter(battle_code=candidate).exists():
            return candidate
    raise RuntimeError("Failed to generate a unique battle code.")


def _assign_new_battle_code(profile, attempts=20):
    for _ in range(attempts):
        profile.battle_code = _generate_unique_battle_code()
        try:
            with transaction.atomic():
                profile.save(update_fields=["battle_code", "updated_at"])
            return profile
        except IntegrityError:
            continue
    raise RuntimeError("Failed to assign a unique battle code.")


def get_or_create_battle_profile(user):
    profile, created = BattleProfile.objects.get_or_create(
        user=user,
        defaults={"battle_code": _generate_unique_battle_code()},
    )
    if created:
        return _ensure_unique_battle_code(profile)
    return _ensure_unique_battle_code(profile)


def issue_new_battle_code(user):
    profile = get_or_create_battle_profile(user)
    return _assign_new_battle_code(profile)


def _find_open_battle_for_user(user):
    return (
        YuntaekBattle.objects.select_related("requester", "opponent")
        .filter(Q(requester=user) | Q(opponent=user), status__in=OPEN_BATTLE_STATUSES)
        .order_by("-requested_at", "-id")
        .first()
    )


def _find_pending_result_battle_for_user(user):
    participant = (
        BattleParticipant.objects.select_related("battle")
        .filter(
            user=user,
            result_seen_at__isnull=True,
            battle__status__in=RESULT_PENDING_STATUSES,
        )
        .order_by("-battle__completed_at", "-battle_id")
        .first()
    )
    return participant.battle if participant else None


def reconcile_battle_profile(user):
    with transaction.atomic():
        profile = (
            BattleProfile.objects.select_for_update()
            .filter(user=user)
            .first()
        )
        if not profile:
            profile = get_or_create_battle_profile(user)
            profile = (
                BattleProfile.objects.select_for_update()
                .get(pk=profile.pk)
            )

        open_battle = _find_open_battle_for_user(user)
        pending_result_battle = _find_pending_result_battle_for_user(user)

        changed_fields = []

        if profile.active_battle_id != (open_battle.id if open_battle else None):
            profile.active_battle = open_battle
            changed_fields.append("active_battle")

        if profile.pending_result_battle_id != (pending_result_battle.id if pending_result_battle else None):
            profile.pending_result_battle = pending_result_battle
            changed_fields.append("pending_result_battle")

        if changed_fields:
            changed_fields.append("updated_at")
            profile.save(update_fields=changed_fields)

    return profile


def reconcile_locked_battle_profile(profile):
    profile = _ensure_unique_battle_code(profile)

    open_battle = _find_open_battle_for_user(profile.user)
    pending_result_battle = _find_pending_result_battle_for_user(profile.user)

    changed_fields = []

    if profile.active_battle_id != (open_battle.id if open_battle else None):
        profile.active_battle = open_battle
        changed_fields.append("active_battle")

    if profile.pending_result_battle_id != (pending_result_battle.id if pending_result_battle else None):
        profile.pending_result_battle = pending_result_battle
        changed_fields.append("pending_result_battle")

    if changed_fields:
        changed_fields.append("updated_at")
        profile.save(update_fields=changed_fields)

    return profile


def serialize_battle_summary(battle):
    if not battle:
        return None
    return {
        "id": battle.id,
        "status": battle.status,
        "category": battle.category,
        "target_year": battle.target_year,
        "target_month": battle.target_month,
    }


def get_battle_entry(user):
    from apps.battles.services.request_service import expire_overdue_requested_battles

    expire_overdue_requested_battles(limit=20)

    profile = (
        BattleProfile.objects.select_related(
            "active_battle__requester",
            "active_battle__opponent",
            "pending_result_battle",
        )
        .filter(user=user)
        .first()
    )
    if not profile:
        profile = get_or_create_battle_profile(user)
        profile = (
            BattleProfile.objects.select_related(
                "active_battle__requester",
                "active_battle__opponent",
                "pending_result_battle",
            )
            .get(pk=profile.pk)
        )

    if profile.active_battle_id:
        battle = profile.active_battle
        opponent = battle.opponent if battle.requester_id == user.id else battle.requester
        opponent_profile = get_or_create_battle_profile(opponent)

        if battle.status == YuntaekBattle.Status.REQUESTED:
            is_requester = battle.requester_id == user.id
            return {
                "battle_id": battle.id,
                "next_screen": "search",
                "path": "/challenge-battle/search",
                "view_mode": "request_pending" if is_requester else "request_received",
                "category": battle.category,
                "opponent_display_name": get_battle_display_name(opponent),
                "opponent_battle_code": opponent_profile.battle_code,
                "opponent_character_type": opponent.character_type,
                "request_deadline_at": battle.request_deadline_at,
                "can_accept": not is_requester,
                "can_reject": not is_requester,
                "can_cancel": is_requester,
            }

        if battle.status in [YuntaekBattle.Status.ACTIVE, YuntaekBattle.Status.WAITING_FOR_SCORE]:
            return {
                "battle_id": battle.id,
                "next_screen": "progress",
                "path": "/challenge-battle/progress",
            }

    if profile.pending_result_battle_id:
        return {
            "battle_id": profile.pending_result_battle_id,
            "next_screen": "result",
            "path": "/challenge-battle/result2",
        }

    return {
        "next_screen": "intro",
        "path": "/challenge-battle/search",
    }
