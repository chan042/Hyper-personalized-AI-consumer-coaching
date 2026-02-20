"""
알림 생성 헬퍼 함수
코칭, 월간 리포트 생성 시 호출하여 알림을 생성합니다.
"""
from .models import Notification


def create_notification(user, notification_type, title, message, **kwargs):
    """
    알림 생성 헬퍼 함수
    
    Args:
        user: 알림을 받을 사용자
        notification_type: 알림 타입 (COACHING, MONTHLY_REPORT)
        title: 알림 제목
        message: 알림 메시지
        **kwargs: related_id, related_year, related_month 등 추가 필드
    
    Returns:
        생성된 Notification 객체
    """
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        related_id=kwargs.get('related_id'),
        related_year=kwargs.get('related_year'),
        related_month=kwargs.get('related_month'),
    )


def create_coaching_notification(user, coaching):
    """
    코칭 생성 알림
    
    Args:
        user: 알림을 받을 사용자
        coaching: 생성된 Coaching 객체
    
    Returns:
        생성된 Notification 객체
    """
    return create_notification(
        user=user,
        notification_type='COACHING',
        title='새로운 코칭이 생성되었습니다',
        message=f'{coaching.title} - {coaching.subject}',
        related_id=coaching.id
    )


def create_monthly_report_notification(user, year, month):
    """
    월간 리포트 생성 알림 (윤택지수 + AI 리포트 통합)
    
    Args:
        user: 알림을 받을 사용자
        year: 리포트 연도
        month: 리포트 월
    
    Returns:
        생성된 Notification 객체
    """
    return create_notification(
        user=user,
        notification_type='MONTHLY_REPORT',
        title='윤택지수와 AI 분석 리포트가 생성되었습니다',
        message=f'{year}년 {month}월 윤택지수와 AI 분석 리포트를 확인해보세요!',
        related_year=year,
        related_month=month
    )


def create_challenge_notification(user, title, message, **kwargs):
    """
    챌린지 관련 알림
    """
    return create_notification(
        user=user,
        notification_type='CHALLENGE',
        title=title,
        message=message,
        related_id=kwargs.get('related_id'),
    )
