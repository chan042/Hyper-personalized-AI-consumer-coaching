"""
Celery tasks for user-related operations
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task
def generate_monthly_reports_for_all_users():
    """
    매월 1일 00시에 실행되어 모든 사용자의 전월 리포트를 생성합니다.
    이 작업은 Celery Beat 스케줄러에 의해 자동으로 실행됩니다.
    """
    from apps.users.models import MonthlyReport
    from external.gemini.client import GeminiClient
    from apps.users.services import (
        get_previous_month,
        is_new_user_for_month,
        collect_report_data,
        save_report_cache,
    )

    now = timezone.localdate()
    year, month = get_previous_month(now.year, now.month)

    logger.info(f"월간 리포트 배치 작업 시작: {year}년 {month}월")

    users = User.objects.all()
    success_count = 0
    fail_count = 0

    for user in users:
        try:
            # 이미 해당 월의 리포트가 있으면 스킵
            if MonthlyReport.objects.filter(user=user, year=year, month=month).exists():
                logger.info(f"사용자 {user.id}의 {year}년 {month}월 리포트는 이미 존재합니다.")
                continue

            # 신규 사용자 스킵
            if is_new_user_for_month(user, year, month):
                logger.info(f"사용자 {user.id}는 {year}년 {month}월 신규 사용자입니다. 리포트 생성 스킵.")
                continue

            # 데이터 수집 + AI 리포트 생성
            report_data = collect_report_data(user, year, month)
            client = GeminiClient(purpose="analysis")
            report_content = client.generate_monthly_report(report_data)

            if not report_content or not isinstance(report_content, dict):
                logger.error(f"사용자 {user.id}의 리포트 생성 실패: 잘못된 응답 형식")
                fail_count += 1
                continue

            save_report_cache(user, year, month, report_content)
            logger.info(f"사용자 {user.id}의 {year}년 {month}월 리포트 생성 완료")
            success_count += 1

        except Exception as e:
            logger.error(f"사용자 {user.id}의 리포트 생성 중 오류 발생: {e}", exc_info=True)
            fail_count += 1
            continue

    logger.info(f"월간 리포트 배치 작업 완료: 성공 {success_count}건, 실패 {fail_count}건")

    return {
        'year': year,
        'month': month,
        'success_count': success_count,
        'fail_count': fail_count,
        'total_users': users.count()
    }
