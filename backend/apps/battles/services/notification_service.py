from datetime import timedelta

from apps.notifications.models import Notification
from apps.notifications.services import create_battle_notification

from .profile_service import get_battle_display_name


def _create_battle_notification_once(user, event_code, title, message, battle_id, payload=None):
    existing = Notification.objects.filter(
        user=user,
        notification_type=Notification.NotificationType.BATTLE,
        event_code=event_code,
        related_id=battle_id,
        title=title,
        message=message,
    ).first()
    if existing:
        return existing

    return create_battle_notification(
        user,
        event_code,
        title,
        message,
        battle_id,
        payload=payload,
    )


def notify_battle_mission_won(battle, mission, winner_id):
    winner = battle.requester if battle.requester_id == winner_id else battle.opponent
    loser = battle.opponent if battle.requester_id == winner_id else battle.requester
    winner_name = get_battle_display_name(winner)
    mission_title = mission.title_snapshot
    payload = {
        "category": battle.category,
        "mission_id": mission.id,
        "mission_title": mission_title,
        "winner_user_id": winner_id,
        "point_value": mission.point_value,
    }

    create_battle_notification(
        winner,
        Notification.BattleEventCode.MISSION_WON,
        "윤택지수 대결 미션을 먼저 성공했어요",
        f"'{mission_title}' 미션을 먼저 성공했어요. +{mission.point_value}점이 반영됐어요.",
        battle.id,
        payload=payload,
    )
    create_battle_notification(
        loser,
        Notification.BattleEventCode.OPPONENT_MISSION_WON,
        f"{winner_name}님이 먼저 미션에 성공했어요",
        f"{winner_name}님이 '{mission_title}' 미션을 먼저 성공했어요.",
        battle.id,
        payload=payload,
    )


def notify_battle_zero_spend_restart(battle, mission, user, streak_days, reference_date):
    target_category = mission.verification_snapshot.get("category") or "목표 카테고리"
    restart_date = reference_date + timedelta(days=1)
    payload = {
        "category": battle.category,
        "mission_id": mission.id,
        "mission_title": mission.title_snapshot,
        "target_category": target_category,
        "streak_days": streak_days,
        "reference_date": reference_date.isoformat(),
        "restart_date": restart_date.isoformat(),
    }

    _create_battle_notification_once(
        user,
        Notification.BattleEventCode.STREAK_RESET,
        "윤택지수 대결 무지출 측정이 다시 시작돼요",
        (
            f"{reference_date.isoformat()}에 {target_category} 지출이 있어 "
            f"'{mission.title_snapshot}' 미션의 {streak_days}일 연속 기록이 끊겼어요. "
            f"{restart_date.isoformat()}부터 다시 측정이 시작돼요."
        ),
        battle.id,
        payload=payload,
    )
