"""
알림 생성 및 정리 서비스.
"""

from datetime import timedelta

from django.utils import timezone

from .models import Notification


def create_notification(user, notification_type, title, message, **kwargs):
    """
    공통 알림 생성 함수.
    """
    payload = kwargs.get("payload")
    if payload is None:
        payload = {}

    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        related_id=kwargs.get("related_id"),
        related_year=kwargs.get("related_year"),
        related_month=kwargs.get("related_month"),
        event_code=kwargs.get("event_code", ""),
        payload=payload,
    )


def create_coaching_notification(user, coaching):
    return create_notification(
        user=user,
        notification_type=Notification.NotificationType.COACHING,
        title="새로운 코칭이 생성되었어요",
        message=f"{coaching.title} - {coaching.subject}",
        related_id=coaching.id,
    )


def create_monthly_report_notification(user, year, month):
    return create_notification(
        user=user,
        notification_type=Notification.NotificationType.MONTHLY_REPORT,
        title="윤택지수와 AI 분석 리포트가 생성되었어요",
        message=f"{year}년 {month}월 윤택지수와 AI 분석 리포트를 확인해보세요!",
        related_year=year,
        related_month=month,
    )


def create_challenge_notification(user, title, message, **kwargs):
    return create_notification(
        user=user,
        notification_type=Notification.NotificationType.CHALLENGE,
        title=title,
        message=message,
        related_id=kwargs.get("related_id"),
    )


def create_battle_notification(user, event_code, title, message, battle_id, payload=None):
    merged_payload = {"battle_id": battle_id}
    if payload:
        merged_payload.update(payload)

    return create_notification(
        user=user,
        notification_type=Notification.NotificationType.BATTLE,
        title=title,
        message=message,
        related_id=battle_id,
        event_code=event_code,
        payload=merged_payload,
    )


def _format_challenge_title(challenge_name: str, is_success: bool) -> str:
    name = (challenge_name or "").strip() or "챌린지"
    title_name = name if name.endswith("챌린지") else f"{name} 챌린지"
    status_text = "성공했어요." if is_success else "실패했어요."
    return f"{title_name} {status_text}"


def create_challenge_result_notification(user_challenge, is_success: bool, failure_reason: str = None):
    title = _format_challenge_title(user_challenge.name, is_success)
    if is_success:
        message = "보상받기를 눌러 포인트를 획득해보세요!"
    else:
        message = (failure_reason or "").strip() or "성공 조건을 충족하지 못했어요."

    return create_challenge_notification(
        user=user_challenge.user,
        title=title,
        message=message,
        related_id=user_challenge.id,
    )


def cleanup_old_notifications(retention_days=Notification.RETENTION_DAYS):
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted_count, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    return deleted_count
