from datetime import datetime

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound

from apps.battles.models import BattleParticipant, BattleProfile, BattleReward, YuntaekBattle
from apps.battles.services.profile_service import get_battle_display_name
from apps.battles.services.reward_service import grant_battle_reward
from apps.notifications.models import Notification
from apps.notifications.services import create_battle_notification
from apps.users.services import (
    ensure_score_snapshot,
    get_cached_score_snapshot,
    is_new_user_for_month,
    save_score_snapshot,
)


RESULT_VISIBLE_STATUSES = [
    YuntaekBattle.Status.WAITING_FOR_SCORE,
    YuntaekBattle.Status.COMPLETED,
    YuntaekBattle.Status.DRAW,
]

WARNING_COMPONENT_BY_CATEGORY = {
    YuntaekBattle.Category.HEALTH: "health_score",
    YuntaekBattle.Category.GROWTH: "growth_consumption",
}

BATTLE_WIN_POINTS = 500
BATTLE_DRAW_POINTS = 500
BATTLE_DELAY_COMPENSATION_POINTS = 200


def _zero_score_snapshot(year, month):
    return {
        "total_score": 0,
        "max_score": 100,
        "year": year,
        "month": month,
        "breakdown": {
            "budget_achievement": 0,
            "alternative_action": 0,
            "spending_consistency": 0,
            "challenge_success": 0,
            "health_score": 0,
            "leakage_improvement": 0,
            "growth_consumption": 0,
        },
        "analysis_warnings": [],
    }


def _ensure_battle_score_snapshot(user, year, month):
    cached_score, _ = get_cached_score_snapshot(user, year, month)
    if cached_score:
        return cached_score

    if is_new_user_for_month(user, year, month):
        score_snapshot = _zero_score_snapshot(year, month)
        save_score_snapshot(user, year, month, score_snapshot)
        return score_snapshot

    score_snapshot, _, _ = ensure_score_snapshot(user, year, month)
    return score_snapshot


def _category_score_from_snapshot(battle, score_snapshot):
    return int((score_snapshot.get("breakdown") or {}).get(battle.score_key, 0))


def _has_relevant_analysis_warning(battle, score_snapshot):
    component_name = WARNING_COMPONENT_BY_CATEGORY.get(battle.category)
    if not component_name:
        return False

    warnings = score_snapshot.get("analysis_warnings") or []
    return any(component_name in str(warning) for warning in warnings)


def _build_delay_message(battle):
    if battle.category == YuntaekBattle.Category.HEALTH:
        return "건강 점수 분석이 아직 안정적으로 완료되지 않아 결과를 잠시 계산 중입니다."
    if battle.category == YuntaekBattle.Category.GROWTH:
        return "성장 점수 분석이 아직 안정적으로 완료되지 않아 결과를 잠시 계산 중입니다."
    return "월말 점수를 아직 계산 중입니다."


def _notify_battle_result_completed(battle):
    winner_name = get_battle_display_name(battle.winner) if battle.winner else None
    for user in [battle.requester, battle.opponent]:
        if battle.is_draw:
            title = "윤택지수 대결 결과가 나왔어요"
            message = "이번 대결은 무승부로 종료되었어요. 결과를 확인해보세요."
        elif battle.winner_id == user.id:
            title = "윤택지수 대결에서 승리했어요"
            message = "최종 결과가 확정되었어요. 500포인트와 함께 결과를 확인해보세요."
        else:
            title = "윤택지수 대결 결과가 나왔어요"
            message = f"{winner_name}님이 승리했어요. 최종 결과를 확인해보세요."

        create_battle_notification(
            user,
            Notification.BattleEventCode.RESULT_COMPLETED,
            title,
            message,
            battle.id,
            payload={"category": battle.category},
        )


def _notify_battle_result_delayed(battle, delay_message):
    for user in [battle.requester, battle.opponent]:
        create_battle_notification(
            user,
            Notification.BattleEventCode.RESULT_DELAYED,
            "윤택지수 대결 결과를 계산 중이에요",
            delay_message,
            battle.id,
            payload={"category": battle.category},
        )


def _notify_battle_delay_compensation(battle):
    for user in [battle.requester, battle.opponent]:
        create_battle_notification(
            user,
            Notification.BattleEventCode.DELAY_COMPENSATION_GRANTED,
            "윤택지수 대결 지연 보상이 지급되었어요",
            "결과 지연에 대한 보상 200포인트가 지급되었어요.",
            battle.id,
            payload={"category": battle.category, "points": BATTLE_DELAY_COMPENSATION_POINTS},
        )


def _get_waiting_battle_or_404(battle_id):
    battle = (
        YuntaekBattle.objects.select_for_update()
        .select_related("requester", "opponent")
        .filter(id=battle_id)
        .first()
    )
    if not battle:
        raise NotFound(detail="Battle not found.")
    return battle


def transition_ended_battles_to_waiting(now=None, limit=100):
    now = now or timezone.now()
    battle_ids = list(
        YuntaekBattle.objects.filter(
            status=YuntaekBattle.Status.ACTIVE,
            score_expected_at__isnull=False,
            score_expected_at__lte=now,
        )
        .order_by("score_expected_at", "id")
        .values_list("id", flat=True)[:limit]
    )

    transitioned_count = 0
    for battle_id in battle_ids:
        with transaction.atomic():
            battle = _get_waiting_battle_or_404(battle_id)
            if battle.status != YuntaekBattle.Status.ACTIVE:
                continue

            battle.status = YuntaekBattle.Status.WAITING_FOR_SCORE
            battle.state_version += 1
            battle.save(update_fields=["status", "state_version", "updated_at"])
            transitioned_count += 1

    return {
        "transitioned_count": transitioned_count,
        "battle_ids": battle_ids,
    }


def finalize_single_battle(battle_id, now=None):
    now = now or timezone.now()

    with transaction.atomic():
        battle = _get_waiting_battle_or_404(battle_id)
        if battle.status not in [YuntaekBattle.Status.WAITING_FOR_SCORE, YuntaekBattle.Status.COMPLETED, YuntaekBattle.Status.DRAW]:
            return {"battle_id": battle.id, "status": battle.status, "result": "skipped"}

        if battle.status in [YuntaekBattle.Status.COMPLETED, YuntaekBattle.Status.DRAW]:
            return {"battle_id": battle.id, "status": battle.status, "result": "already_finalized"}

        had_delay_before = bool(battle.last_settlement_error)
        participants = {
            participant.user_id: participant
            for participant in BattleParticipant.objects.select_for_update().filter(
                battle=battle,
                user_id__in=[battle.requester_id, battle.opponent_id],
            )
        }

        score_snapshots = {}
        for user in [battle.requester, battle.opponent]:
            score_snapshot = _ensure_battle_score_snapshot(user, battle.target_year, battle.target_month)
            if _has_relevant_analysis_warning(battle, score_snapshot):
                delay_message = _build_delay_message(battle)
                battle.last_settlement_error = delay_message
                battle.save(update_fields=["last_settlement_error", "updated_at"])
                if not had_delay_before:
                    transaction.on_commit(
                        lambda battle=battle, delay_message=delay_message: _notify_battle_result_delayed(
                            battle, delay_message
                        )
                    )
                return {"battle_id": battle.id, "status": battle.status, "result": "delayed"}
            score_snapshots[user.id] = score_snapshot

        for user in [battle.requester, battle.opponent]:
            participant = participants[user.id]
            score_snapshot = score_snapshots[user.id]
            participant.official_base_score = _category_score_from_snapshot(battle, score_snapshot)
            participant.final_score = participant.official_base_score + participant.mission_bonus_score
            participant.official_score_snapshot = score_snapshot
            participant.save(
                update_fields=["official_base_score", "final_score", "official_score_snapshot"]
            )

        requester_participant = participants[battle.requester_id]
        opponent_participant = participants[battle.opponent_id]

        battle.completed_at = now
        battle.closed_at = now
        battle.result_locked_at = now
        battle.last_settlement_error = ""
        battle.state_version += 1

        if requester_participant.final_score == opponent_participant.final_score:
            battle.status = YuntaekBattle.Status.DRAW
            battle.winner = None
            battle.is_draw = True
            grant_battle_reward(battle, battle.requester, BattleReward.Reason.BATTLE_DRAW, BATTLE_DRAW_POINTS)
            grant_battle_reward(battle, battle.opponent, BattleReward.Reason.BATTLE_DRAW, BATTLE_DRAW_POINTS)
        else:
            winner = battle.requester if requester_participant.final_score > opponent_participant.final_score else battle.opponent
            battle.status = YuntaekBattle.Status.COMPLETED
            battle.winner = winner
            battle.is_draw = False
            grant_battle_reward(battle, winner, BattleReward.Reason.BATTLE_WIN, BATTLE_WIN_POINTS)

        battle.save(
            update_fields=[
                "status",
                "winner",
                "is_draw",
                "completed_at",
                "closed_at",
                "result_locked_at",
                "last_settlement_error",
                "state_version",
                "updated_at",
            ]
        )

        BattleProfile.objects.filter(user_id__in=[battle.requester_id, battle.opponent_id], active_battle_id=battle.id).update(
            active_battle=None
        )
        BattleProfile.objects.filter(user_id__in=[battle.requester_id, battle.opponent_id]).update(
            pending_result_battle=battle
        )

        if had_delay_before:
            grant_battle_reward(
                battle,
                battle.requester,
                BattleReward.Reason.BATTLE_DELAY_COMPENSATION,
                BATTLE_DELAY_COMPENSATION_POINTS,
            )
            grant_battle_reward(
                battle,
                battle.opponent,
                BattleReward.Reason.BATTLE_DELAY_COMPENSATION,
                BATTLE_DELAY_COMPENSATION_POINTS,
            )
            transaction.on_commit(lambda battle=battle: _notify_battle_delay_compensation(battle))

        transaction.on_commit(lambda battle=battle: _notify_battle_result_completed(battle))

    return {"battle_id": battle_id, "status": battle.status, "result": "finalized"}


def finalize_waiting_battles(limit=50):
    battle_ids = list(
        YuntaekBattle.objects.filter(status=YuntaekBattle.Status.WAITING_FOR_SCORE)
        .order_by("score_expected_at", "id")
        .values_list("id", flat=True)[:limit]
    )

    finalized = 0
    delayed = 0
    for battle_id in battle_ids:
        result = finalize_single_battle(battle_id)
        if result["result"] == "finalized":
            finalized += 1
        elif result["result"] == "delayed":
            delayed += 1

    return {
        "battle_ids": battle_ids,
        "finalized_count": finalized,
        "delayed_count": delayed,
    }


def _result_mission_payload(mission):
    return {
        "id": mission.id,
        "title": mission.title_snapshot,
        "description": mission.description_snapshot,
        "status": mission.status,
        "winner_name": get_battle_display_name(mission.winner) if mission.winner else None,
        "point_value": mission.point_value,
    }


def _participant_result_payload(participant, fallback_user):
    profile_snapshot = participant.profile_snapshot or {}
    return {
        "name": get_battle_display_name(fallback_user),
        "character_type": profile_snapshot.get("character_type") or fallback_user.character_type,
        "mission_won_count": participant.mission_won_count,
        "mission_bonus_score": participant.mission_bonus_score,
        "official_base_score": participant.official_base_score,
        "final_score": participant.final_score,
        "official_score_snapshot": participant.official_score_snapshot,
    }


def _get_result_battle_for_user_or_404(user, battle_id):
    battle = (
        YuntaekBattle.objects.select_related("requester", "opponent", "winner")
        .filter(id=battle_id)
        .filter(Q(requester=user) | Q(opponent=user))
        .first()
    )
    if not battle:
        raise NotFound(detail="Battle not found.")
    return battle


def get_battle_result(user, battle_id):
    battle = _get_result_battle_for_user_or_404(user, battle_id)

    if battle.status == YuntaekBattle.Status.WAITING_FOR_SCORE:
        return {
            "battle_id": battle.id,
            "status": battle.status,
            "category": battle.category,
            "target_year": battle.target_year,
            "target_month": battle.target_month,
            "result_ready": False,
            "delay_reason_code": "RESULT_DELAYED",
            "delay_message": battle.last_settlement_error or _build_delay_message(battle),
        }

    if battle.status not in [YuntaekBattle.Status.COMPLETED, YuntaekBattle.Status.DRAW]:
        raise NotFound(detail="Battle result not found.")

    participants = {
        participant.user_id: participant
        for participant in BattleParticipant.objects.filter(battle=battle, user_id__in=[battle.requester_id, battle.opponent_id])
    }
    me = battle.requester if battle.requester_id == user.id else battle.opponent
    opponent = battle.opponent if battle.requester_id == user.id else battle.requester
    my_participant = participants[me.id]
    opponent_participant = participants[opponent.id]
    missions = list(battle.missions.select_related("winner").order_by("id"))

    if battle.is_draw:
        my_outcome = "DRAW"
    elif battle.winner_id == user.id:
        my_outcome = "WIN"
    else:
        my_outcome = "LOSE"

    return {
        "battle_id": battle.id,
        "status": battle.status,
        "category": battle.category,
        "target_year": battle.target_year,
        "target_month": battle.target_month,
        "result_ready": True,
        "is_draw": battle.is_draw,
        "winner_name": get_battle_display_name(battle.winner) if battle.winner else None,
        "my_outcome": my_outcome,
        "completed_at": battle.completed_at,
        "me": _participant_result_payload(my_participant, me),
        "opponent": _participant_result_payload(opponent_participant, opponent),
        "missions": [_result_mission_payload(mission) for mission in missions],
    }


def confirm_battle_result(user, battle_id):
    with transaction.atomic():
        battle = _get_result_battle_for_user_or_404(user, battle_id)
        if battle.status not in [YuntaekBattle.Status.COMPLETED, YuntaekBattle.Status.DRAW]:
            raise NotFound(detail="Battle result not found.")

        participant = (
            BattleParticipant.objects.select_for_update()
            .filter(battle=battle, user=user)
            .first()
        )
        if not participant:
            raise NotFound(detail="Battle result not found.")

        if participant.result_seen_at is None:
            participant.result_seen_at = timezone.now()
            participant.save(update_fields=["result_seen_at"])

        BattleProfile.objects.filter(user=user, pending_result_battle_id=battle.id).update(
            pending_result_battle=None
        )

        all_seen = not BattleParticipant.objects.filter(
            battle=battle,
            user_id__in=[battle.requester_id, battle.opponent_id],
            result_seen_at__isnull=True,
        ).exists()
        if all_seen:
            BattleProfile.objects.filter(
                user_id__in=[battle.requester_id, battle.opponent_id],
                pending_result_battle_id=battle.id,
            ).update(pending_result_battle=None)

    return {"battle_id": battle_id, "confirmed": True}
