from django.utils import timezone
from collections import defaultdict
import calendar
from .models import MonthlyLog

def get_daily_status(user, year, month, transactions):
    """
    Transactions 쿼리셋을 받아 일별 지출 상태 및 통계를 계산하여 반환
    """
    daily_stats = defaultdict(int)

    for t in transactions:
        local_date = timezone.localtime(t.date).date()
        date_str = local_date.strftime('%Y-%m-%d')
        daily_stats[date_str] += t.amount

    # 두둑 상태 계산
    daily_status_data = {}
    
    today = timezone.localdate()
    target_year = int(year) if year else today.year
    target_month = int(month) if month else today.month

    monthly_budget = 0
    
    # 과거인지 확인 (간단한 로직: 연도가 작거나, 연도가 같고 월이 작으면 과거)
    is_past = (target_year < today.year) or (target_year == today.year and target_month < today.month)

    if is_past:
            # 과거라면 Snapshot(MonthlyLog)에서 조회
        try:
            log = MonthlyLog.objects.get(user=user, year=target_year, month=target_month)
            monthly_budget = log.monthly_budget
        except MonthlyLog.DoesNotExist:
            # 스냅샷이 없으면 현재 설정값 사용 (fallback)
            monthly_budget = user.monthly_budget if user.monthly_budget else 0
    else:
        # 현재/미래라면 User의 현재 설정값 사용
        monthly_budget = user.monthly_budget if user.monthly_budget else 0

    # 일일 예산 계산
    # 이번 달의 전체 지출액 (필터링된 쿼리셋 기준)
    total_spent_month = sum(daily_stats.values())
    
    calculated_daily_budget = calculate_target_daily_budget(
        monthly_budget, 
        target_year, 
        target_month, 
        total_spent_month
    )

    # 상태 아이콘 부여
    for date_str, total in daily_stats.items():
        status_value = 'money' # 기본값
        
        # 계산된 일일 예산이 0 이하인 경우 (이미 예산 초과 or 예산 0) -> 지출 있으면 무조건 angry
        if calculated_daily_budget <= 0:
            status_value = 'angry' if total > 0 else 'money'
        else:
            ratio = total / calculated_daily_budget
            if ratio <= 0.5:
                status_value = 'money'
            elif ratio <= 1.0:
                status_value = 'happy'
            elif ratio <= 1.5:
                status_value = 'sad'
            else:
                status_value = 'angry'

        daily_status_data[date_str] = {
            "total_spent": total,
            "status": status_value
        }
    
    return daily_status_data, calculated_daily_budget

def calculate_target_daily_budget(monthly_budget, year, month, total_spent_month):
    """
    권장 일일 예산 계산
    """
    today = timezone.localdate()
    _, last_day = calendar.monthrange(year, month)
    
    # 이번 달인 경우: 잔여 예산 / 잔여 일수
    if year == today.year and month == today.month:
        remaining_days = last_day - today.day + 1
        if remaining_days < 1: remaining_days = 1
        
        remaining_budget = monthly_budget - total_spent_month
        return int(remaining_budget / remaining_days)
    else:
        # 과거/미래인 경우: 월 예산 / 전체 일수
        return int(monthly_budget / last_day)
