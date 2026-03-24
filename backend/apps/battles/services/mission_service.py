import calendar
from datetime import datetime

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.battles.models import BattleMission, BattleParticipant, YuntaekBattle
from apps.challenges.models import UserChallenge
from apps.transactions.models import Transaction


CATEGORY_ALIASES = {
    "카페": "카페/간식",
}


def _normalize_category(category):
    if not category:
        return ""
    return CATEGORY_ALIASES.get(category, category)


def _battle_month_end(battle):
    tz = timezone.get_current_timezone()
    last_day = calendar.monthrange(battle.target_year, battle.target_month)[1]
    return timezone.make_aware(
        datetime(battle.target_year, battle.target_month, last_day, 23, 59, 59),
        tz,
    )


def _get_active_battle_for_user(user_id):
    return (
        YuntaekBattle.objects.select_related("requester", "opponent")
        .filter(Q(requester_id=user_id) | Q(opponent_id=user_id), status=YuntaekBattle.Status.ACTIVE)
        .order_by("-started_at", "-id")
        .first()
    )


def _ordered_category_transactions(user_id, battle, category, trigger_transaction_id=None):
    return list(
        Transaction.objects.filter(
            user_id=user_id,
            date__year=battle.target_year,
            date__month=battle.target_month,
        )
        .filter(Q(created_at__gte=battle.started_at) | Q(id=trigger_transaction_id))
        .order_by("created_at", "id")
        .only("id", "date", "created_at", "amount", "category")
    )


def _filtered_category_transactions(user_id, battle, category, trigger_transaction_id=None):
    normalized_category = _normalize_category(category)
    return [
        transaction_obj
        for transaction_obj in _ordered_category_transactions(
            user_id,
            battle,
            category,
            trigger_transaction_id=trigger_transaction_id,
        )
        if _normalize_category(transaction_obj.category) == normalized_category
    ]


def _evaluate_transaction_category_count(
    user_id,
    battle,
    verification_config,
    *,
    trigger_transaction_id=None,
    observed_at=None,
):
    category = verification_config.get("category")
    required_count = int(verification_config.get("required_count", 0))
    transactions = _filtered_category_transactions(
        user_id,
        battle,
        category,
        trigger_transaction_id=trigger_transaction_id,
    )

    if required_count <= 0 or len(transactions) < required_count:
        return None

    trigger_transaction = transactions[required_count - 1]
    matched_ids = [transaction_obj.id for transaction_obj in transactions[:required_count]]
    achieved_at = observed_at or trigger_transaction.created_at
    return {
        "achieved_at": achieved_at,
        "evidence": {
            "type": "transaction_category_count",
            "category": category,
            "required_count": required_count,
            "count_snapshot": required_count,
            "matched_transaction_ids": matched_ids,
            "trigger_transaction_id": trigger_transaction_id or trigger_transaction.id,
            "achievement_date": achieved_at.isoformat(),
        },
    }


def _evaluate_transaction_category_amount(
    user_id,
    battle,
    verification_config,
    *,
    trigger_transaction_id=None,
    observed_at=None,
):
    category = verification_config.get("category")
    target_amount = int(verification_config.get("target_amount", 0))
    transactions = _filtered_category_transactions(
        user_id,
        battle,
        category,
        trigger_transaction_id=trigger_transaction_id,
    )

    if target_amount <= 0:
        return None

    running_total = 0
    matched_ids = []
    for transaction_obj in transactions:
        running_total += transaction_obj.amount
        matched_ids.append(transaction_obj.id)
        if running_total >= target_amount:
            achieved_at = observed_at or transaction_obj.created_at
            return {
                "achieved_at": achieved_at,
                "evidence": {
                    "type": "transaction_category_amount",
                    "category": category,
                    "target_amount": target_amount,
                    "amount_snapshot": running_total,
                    "matched_transaction_ids": matched_ids,
                    "trigger_transaction_id": trigger_transaction_id or transaction_obj.id,
                    "achievement_date": achieved_at.isoformat(),
                },
            }
    return None


def _evaluate_ai_challenge_started_count(user_id, battle, verification_config):
    required_count = int(verification_config.get("required_count", 0))
    started_challenges = list(
        UserChallenge.objects.filter(
            user_id=user_id,
            source_type="ai",
            status__in=["active", "completed", "failed"],
            started_at__isnull=False,
            started_at__gte=battle.started_at,
        )
        .order_by("started_at", "id")
        .only("id", "started_at")
    )

    if required_count <= 0 or len(started_challenges) < required_count:
        return None

    trigger_challenge = started_challenges[required_count - 1]
    return {
        "achieved_at": trigger_challenge.started_at,
        "evidence": {
            "type": "ai_challenge_started_count",
            "required_count": required_count,
            "matched_user_challenge_ids": [challenge.id for challenge in started_challenges[:required_count]],
            "trigger_user_challenge_id": trigger_challenge.id,
            "achievement_date": trigger_challenge.started_at.isoformat(),
        },
    }


def _evaluate_ai_challenge_completed_count(user_id, battle, verification_config):
    required_count = int(verification_config.get("required_count", 0))
    completed_challenges = list(
        UserChallenge.objects.filter(
            user_id=user_id,
            source_type="ai",
            status="completed",
            completed_at__isnull=False,
            completed_at__gte=battle.started_at,
        )
        .order_by("completed_at", "id")
        .only("id", "completed_at")
    )

    if required_count <= 0 or len(completed_challenges) < required_count:
        return None

    trigger_challenge = completed_challenges[required_count - 1]
    return {
        "achieved_at": trigger_challenge.completed_at,
        "evidence": {
            "type": "ai_challenge_completed_count",
            "required_count": required_count,
            "matched_user_challenge_ids": [challenge.id for challenge in completed_challenges[:required_count]],
            "trigger_user_challenge_id": trigger_challenge.id,
            "achievement_date": trigger_challenge.completed_at.isoformat(),
        },
    }


def _evaluate_challenge_template_complete(user_id, battle, verification_config):
    template_id = verification_config.get("template_id")
    if not template_id:
        return None

    challenge = (
        UserChallenge.objects.filter(
            user_id=user_id,
            template_id=template_id,
            status="completed",
            completed_at__isnull=False,
            completed_at__gte=battle.started_at,
        )
        .order_by("completed_at", "id")
        .only("id", "completed_at", "template_id")
        .first()
    )
    if not challenge:
        return None

    return {
        "achieved_at": challenge.completed_at,
        "evidence": {
            "type": "challenge_template_complete",
            "template_id": template_id,
            "template_name": verification_config.get("template_name"),
            "user_challenge_id": challenge.id,
            "achievement_date": challenge.completed_at.isoformat(),
        },
    }


EVALUATORS = {
    "transaction_category_count": _evaluate_transaction_category_count,
    "transaction_category_amount": _evaluate_transaction_category_amount,
    "ai_challenge_started_count": _evaluate_ai_challenge_started_count,
    "ai_challenge_completed_count": _evaluate_ai_challenge_completed_count,
    "challenge_template_complete": _evaluate_challenge_template_complete,
}


def _evaluate_mission_for_user(user_id, battle, mission, *, trigger_transaction_id=None, observed_at=None):
    evaluator = EVALUATORS.get(mission.template.verification_type)
    if not evaluator:
        return None
    return evaluator(
        user_id,
        battle,
        mission.verification_snapshot or {},
        trigger_transaction_id=trigger_transaction_id,
        observed_at=observed_at,
    )


def _settle_mission_for_user(battle_id, mission_id, user_id, evaluation):
    achieved_at = evaluation["achieved_at"]
    evidence = evaluation["evidence"]

    with transaction.atomic():
        mission = (
            BattleMission.objects.select_for_update()
            .select_related("battle", "template")
            .get(id=mission_id, battle_id=battle_id)
        )
        if mission.status != BattleMission.Status.OPEN:
            return False

        mission.status = BattleMission.Status.WON
        mission.winner_id = user_id
        mission.won_at = achieved_at
        mission.win_evidence_snapshot = evidence
        mission.save(update_fields=["status", "winner", "won_at", "win_evidence_snapshot"])

        participant = BattleParticipant.objects.select_for_update().get(battle_id=battle_id, user_id=user_id)
        participant.mission_won_count += 1
        participant.mission_bonus_score += mission.point_value
        participant.save(update_fields=["mission_won_count", "mission_bonus_score"])

        YuntaekBattle.objects.filter(id=battle_id).update(state_version=F("state_version") + 1)

    return True


def evaluate_active_battle_missions_for_user(user_id, *, trigger_transaction_id=None, observed_at=None):
    battle = _get_active_battle_for_user(user_id)
    if not battle:
        return 0

    open_missions = list(
        battle.missions.select_related("template").filter(status=BattleMission.Status.OPEN).order_by("id")
    )
    settled_count = 0

    for mission in open_missions:
        evaluation = _evaluate_mission_for_user(
            user_id,
            battle,
            mission,
            trigger_transaction_id=trigger_transaction_id,
            observed_at=observed_at,
        )
        if not evaluation:
            continue
        if _settle_mission_for_user(battle.id, mission.id, user_id, evaluation):
            settled_count += 1

    return settled_count
