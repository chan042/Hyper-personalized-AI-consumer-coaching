from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    """
    사용자 알림 모델.
    코칭, 월간 리포트, 챌린지, 윤택지수 대결 알림을 함께 저장한다.
    """

    class NotificationType(models.TextChoices):
        COACHING = "COACHING", "코칭 생성"
        MONTHLY_REPORT = "MONTHLY_REPORT", "월간 리포트 생성"
        CHALLENGE = "CHALLENGE", "챌린지"
        BATTLE = "BATTLE", "윤택지수 대결"

    class BattleEventCode(models.TextChoices):
        REQUEST_RECEIVED = "BATTLE_REQUEST_RECEIVED", "대결 신청 도착"
        REQUEST_ACCEPTED = "BATTLE_REQUEST_ACCEPTED", "대결 신청 수락"
        REQUEST_REJECTED = "BATTLE_REQUEST_REJECTED", "대결 신청 거절"
        REQUEST_CANCELED = "BATTLE_REQUEST_CANCELED", "대결 신청 취소"
        REQUEST_EXPIRED = "BATTLE_REQUEST_EXPIRED", "대결 신청 만료"
        RESULT_DELAYED = "BATTLE_RESULT_DELAYED", "대결 결과 지연"
        RESULT_COMPLETED = "BATTLE_RESULT_COMPLETED", "대결 결과 확정"
        DELAY_COMPENSATION_GRANTED = "BATTLE_DELAY_COMPENSATION_GRANTED", "지연 보상 지급"

    RETENTION_DAYS = 90

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)

    # 기존 알림 호환용 참조 필드
    related_id = models.IntegerField(null=True, blank=True)
    related_year = models.IntegerField(null=True, blank=True)
    related_month = models.IntegerField(null=True, blank=True)

    # 배틀 알림 확장용 세부 이벤트와 추가 데이터
    event_code = models.CharField(max_length=64, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "-created_at"]),
        ]
        verbose_name = "알림"
        verbose_name_plural = "알림 목록"

    def __str__(self):
        return f"{self.user.username} - {self.get_notification_type_display()} ({self.created_at})"

    @property
    def is_expired(self):
        expiration_date = self.created_at + timedelta(days=self.RETENTION_DAYS)
        return timezone.now() > expiration_date

    def _battle_redirect_url(self):
        battle_id = (self.payload or {}).get("battle_id") or self.related_id

        if self.event_code == self.BattleEventCode.REQUEST_RECEIVED and battle_id:
            return f"/challenge-battle/search?screen=request_received&battleId={battle_id}"

        if self.event_code == self.BattleEventCode.REQUEST_ACCEPTED:
            return "/challenge-battle/progress"

        if self.event_code in {
            self.BattleEventCode.REQUEST_REJECTED,
            self.BattleEventCode.REQUEST_CANCELED,
            self.BattleEventCode.REQUEST_EXPIRED,
        }:
            return "/challenge-battle/search?screen=intro"

        if self.event_code in {
            self.BattleEventCode.RESULT_DELAYED,
            self.BattleEventCode.RESULT_COMPLETED,
            self.BattleEventCode.DELAY_COMPENSATION_GRANTED,
        } and battle_id:
            return f"/challenge-battle/result2?battleId={battle_id}"

        return "/yuntaek-index"

    def get_redirect_url(self):
        if self.notification_type == self.NotificationType.BATTLE:
            return self._battle_redirect_url()

        return {
            self.NotificationType.COACHING: "/coaching",
            self.NotificationType.MONTHLY_REPORT: "/yuntaek-index",
            self.NotificationType.CHALLENGE: "/challenge",
        }.get(self.notification_type, "/")
