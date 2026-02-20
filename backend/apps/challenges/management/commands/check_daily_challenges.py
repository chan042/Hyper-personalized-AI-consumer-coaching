"""
일일 챌린지 체크 명령어

매일 00:01 실행을 기준으로 다음을 처리한다.
1. 일일 실패 조건(미라클 두둑/현금/원플원) 점검
2. 진행률 일괄 갱신(거래가 없던 날 포함)
3. 종료 시점 도달 챌린지 자동 완료/실패 판정
4. 미래의 나에게 메시지 알림(다음 달 1일)
"""
from datetime import timedelta, date

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.challenges.models import UserChallenge
from apps.challenges.signals import _update_challenge_progress, _evaluate_success
from apps.notifications.services import create_challenge_notification


CONVENIENCE_STORE_KEYWORDS = [
    "편의점",
    "gs25",
    "cu",
    "이마트24",
    "emart24",
    "세븐일레븐",
    "7eleven",
]


def _contains_convenience_store_keyword(text: str) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in CONVENIENCE_STORE_KEYWORDS)


def _count_verified_photos(log) -> int:
    return sum(1 for photo in (log.photo_urls or []) if photo.get("verified", False))


def _sum_convenience_spending(log) -> int:
    spent_by_store = (log.condition_detail or {}).get("spent_by_store", {})
    convenience_spent = 0
    for store_name, amount in spent_by_store.items():
        if _contains_convenience_store_keyword(store_name):
            convenience_spent += amount
    return convenience_spent


class Command(BaseCommand):
    help = "일일 챌린지 체크 - 매일 00:01에 실행"

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()
        yesterday = (now - timedelta(days=1)).date()

        self.stdout.write(f"일일 챌린지 체크 시작: {now}")
        self.stdout.write(f"체크 대상 날짜(일일 실패): {yesterday}")

        active_challenges = UserChallenge.objects.filter(status="active").select_related("user")

        failed_count = 0
        finalized_count = 0

        for uc in active_challenges:
            if not uc.started_at:
                continue

            # 1) 거래가 없던 날도 progress가 갱신되도록 일괄 업데이트
            if uc.started_at.date() <= today:
                _update_challenge_progress(uc)

            if uc.status != "active":
                continue

            # 2) 전일 미입력/미인증 실패 조건 체크
            if uc.started_at.date() <= yesterday:
                success_conditions = uc.success_conditions or {}
                condition_type = success_conditions.get("type", "")

                if condition_type == "daily_check":
                    if self._check_daily_check_failure(uc, yesterday):
                        failed_count += 1
                        self.stdout.write(self.style.WARNING(f"미라클 두둑! 실패: {uc.user.username} - {uc.name}"))
                        continue

                elif condition_type == "amount_limit_with_photo":
                    if self._check_photo_missing_failure(uc, yesterday):
                        failed_count += 1
                        self.stdout.write(self.style.WARNING(f"현금 챌린지 실패: {uc.user.username} - {uc.name}"))
                        continue

                elif condition_type == "photo_verification":
                    photo_condition = success_conditions.get("photo_condition", "")
                    if "1+1" in photo_condition and self._check_one_plus_one_failure(uc, yesterday):
                        failed_count += 1
                        self.stdout.write(self.style.WARNING(f"원플원 러버 실패: {uc.user.username} - {uc.name}"))
                        continue

            if uc.status != "active":
                continue

            # 3) 미래의 나에게: 다음 달 1일 메시지 알림
            self._send_future_message_notification(uc, today)

            # 4) 종료 시점 자동 판정
            if uc.ends_at and now >= uc.ends_at and uc.status == "active":
                progress = uc.progress or {}
                success_conditions = uc.success_conditions or {}
                is_success = _evaluate_success(uc, progress, success_conditions)
                final_spent = progress.get("current", 0)
                uc.complete_challenge(is_success, final_spent)
                finalized_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"일일 챌린지 체크 완료: 실패 처리 {failed_count}건, 종료 판정 {finalized_count}건"
            )
        )

    def _check_daily_check_failure(self, user_challenge, check_date):
        """
        미라클 두둑:
        - 전날 지출 입력(거래 발생) 또는 무지출 체크가 없으면 실패
        """
        start_date = user_challenge.started_at.date()
        if check_date < start_date:
            return False

        log = user_challenge.daily_logs.filter(log_date=check_date).first()
        has_input = bool(log and (log.is_checked or (log.transaction_count or 0) > 0))

        if not has_input:
            user_challenge.complete_challenge(False, user_challenge.progress.get("current", 0))
            return True

        return False

    def _check_photo_missing_failure(self, user_challenge, check_date):
        """
        현금 챌린지: 전날 사진 미인증 시 실패
        """
        start_date = user_challenge.started_at.date()
        if check_date < start_date:
            return False

        log = user_challenge.daily_logs.filter(log_date=check_date).first()
        if not log or _count_verified_photos(log) == 0:
            user_challenge.complete_challenge(False, user_challenge.progress.get("current", 0))
            return True

        return False

    def _check_one_plus_one_failure(self, user_challenge, check_date):
        """
        원플원 러버: 전날 편의점 소비가 있었는데 사진 인증이 없으면 실패
        """
        start_date = user_challenge.started_at.date()
        if check_date < start_date:
            return False

        log = user_challenge.daily_logs.filter(log_date=check_date).first()
        if not log:
            return False

        convenience_spent = _sum_convenience_spending(log)
        if convenience_spent > 0 and _count_verified_photos(log) == 0:
            user_challenge.complete_challenge(False, user_challenge.progress.get("current", 0))
            return True

        return False

    def _send_future_message_notification(self, user_challenge, today: date):
        """
        미래의 나에게:
        시작 다음 달 1일에 사용자의 입력 메시지 알림 발송
        """
        success_conditions = user_challenge.success_conditions or {}
        if success_conditions.get("compare_type") != "next_month_category":
            return

        if not user_challenge.started_at:
            return

        start_year = user_challenge.started_at.year
        start_month = user_challenge.started_at.month
        if start_month == 12:
            target_year, target_month = start_year + 1, 1
        else:
            target_year, target_month = start_year, start_month + 1

        if today != date(target_year, target_month, 1):
            return

        system_values = user_challenge.system_generated_values or {}
        if system_values.get("future_message_notified", False):
            return

        message = (user_challenge.user_input_values or {}).get("message_to_future")
        if message:
            create_challenge_notification(
                user=user_challenge.user,
                title="미래의 나에게",
                message=message,
            )

        system_values["future_message_notified"] = True
        user_challenge.system_generated_values = system_values
        user_challenge.save(update_fields=["system_generated_values", "updated_at"])
