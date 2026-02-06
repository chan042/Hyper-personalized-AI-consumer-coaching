"""
윤택지수(Yuntaek Score) 산출 알고리즘

총 65점 만점:
- 예산 달성률: 35점
- 대안 행동 실현도: 20점
- 소비 일관성: 7점  
- 챌린지 성공: 3점
"""

from datetime import date, datetime
from decimal import Decimal
import statistics

from django.db.models import Sum, Count
from django.utils import timezone


class YuntaekScoreCalculator:
    """윤택지수 계산기"""
    
    # 점수 가중치
    MAX_BUDGET_SCORE = 35
    MAX_ALTERNATIVE_ACTION_SCORE = 20
    MAX_CONSISTENCY_SCORE = 7
    MAX_CHALLENGE_SCORE = 3
    
    # 챌린지 생성 최소 횟수
    MIN_CHALLENGE_COUNT_FOR_SCORE = 3
    
    def __init__(self, user, year: int, month: int):
        """
        Args:
            user: User 모델 인스턴스
            year: 대상 연도
            month: 대상 월
        """
        self.user = user
        self.year = year
        self.month = month
        # 날짜 범위 캐싱
        self._date_range = None
        self._monthly_budget = None
        
    def calculate(self) -> dict:
        """윤택지수 전체 계산"""
        budget_result = self._calculate_budget_achievement()
        alternative_result = self._calculate_alternative_action()
        consistency_result = self._calculate_spending_consistency()
        challenge_result = self._calculate_challenge_success()
        
        total_score = (
            budget_result['score'] + 
            alternative_result['score'] + 
            consistency_result['score'] + 
            challenge_result['score']
        )
        
        return {
            'total_score': int(total_score),
            'max_score': 65,
            'year': self.year,
            'month': self.month,
            'breakdown': {
                'budget_achievement': budget_result,
                'alternative_action': alternative_result,
                'spending_consistency': consistency_result,
                'challenge_success': challenge_result,
            }
        }
    
    def _calculate_budget_achievement(self) -> dict:
        """
        1. 예산 달성률 (35점)
        
        - 예산 내 지출: 35점 (만점)
        - 1% ~ 5% 초과: 28점
        - 5% ~ 10% 초과: 21점
        - 10% ~ 20% 초과: 14점
        - 20% 이상 초과: 0점
        """
        from apps.transactions.models import Transaction
        
        monthly_budget = self._get_monthly_budget()
        
        if not monthly_budget or monthly_budget <= 0:
            return {
                'score': 0,
                'max': self.MAX_BUDGET_SCORE,
                'details': {
                    'monthly_budget': 0,
                    'total_spent': 0,
                    'exceeded_percent': 0,
                    'message': '예산이 설정되지 않았습니다.'
                }
            }
        
        start_date, end_date = self._get_month_date_range()
        total_spent = Transaction.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        monthly_budget_float = float(monthly_budget)
        
        if total_spent <= monthly_budget_float:
            exceeded_percent = 0
            score = self.MAX_BUDGET_SCORE
        else:
            exceeded_percent = ((total_spent - monthly_budget_float) / monthly_budget_float) * 100
            score = self._get_budget_score_by_exceeded_percent(exceeded_percent)
        
        return {
            'score': score,
            'max': self.MAX_BUDGET_SCORE,
            'details': {
                'monthly_budget': int(monthly_budget_float),
                'total_spent': int(total_spent),
                'exceeded_percent': round(exceeded_percent, 1),
                'within_budget': total_spent <= monthly_budget_float
            }
        }
    
    def _get_budget_score_by_exceeded_percent(self, exceeded_percent: float) -> int:
        """초과율에 따른 예산 달성률 점수 반환"""
        if exceeded_percent <= 0:
            return 35
        elif exceeded_percent <= 5:
            return 28
        elif exceeded_percent <= 10:
            return 21
        elif exceeded_percent <= 20:
            return 14
        return 0
    
    def _calculate_alternative_action(self) -> dict:
        """
        2. 대안 행동 실현도 (20점)
        
        공식: (성공한 AI 코칭 챌린지 건수 / 챌린지 생성 AI 코칭 건수) * 20
        - 코칭 카드에서 3회 이상 챌린지 생성시 점수 반영 (3회 미만 시 0점 처리)
        """
        from apps.challenges.models import UserChallenge
        
        start_date, end_date = self._get_month_date_range()
        
        # 생성 건수와 성공 건수 조회
        ai_challenges = UserChallenge.objects.filter(
            user=self.user,
            source_type='ai',
            created_at__gte=start_date,
            created_at__lt=end_date
        )
        
        challenges_created = ai_challenges.count()
        
        if challenges_created < self.MIN_CHALLENGE_COUNT_FOR_SCORE:
            return {
                'score': 0,
                'max': self.MAX_ALTERNATIVE_ACTION_SCORE,
                'details': {
                    'challenges_created': challenges_created,
                    'successful_challenges': 0,
                    'completion_rate': 0,
                    'message': f'챌린지 생성이 {self.MIN_CHALLENGE_COUNT_FOR_SCORE}회 미만입니다.'
                }
            }
        
        successful_challenges = ai_challenges.filter(status='completed').count()
        
        completion_rate = (successful_challenges / challenges_created) * 100
        score = int((successful_challenges / challenges_created) * self.MAX_ALTERNATIVE_ACTION_SCORE)
        
        return {
            'score': score,
            'max': self.MAX_ALTERNATIVE_ACTION_SCORE,
            'details': {
                'challenges_created': challenges_created,
                'successful_challenges': successful_challenges,
                'completion_rate': round(completion_rate, 1)
            }
        }
    
    def _calculate_spending_consistency(self) -> dict:
        """
        3. 소비 일관성 (7점)

        기준치: (월간 총 예산 / 30) * 2
        공식: Max(0, (1 - (일일 지출 표준편차 / 기준치)) * 7)

        무지출인 날은 계산에서 제외
        """
        from apps.transactions.models import Transaction

        monthly_budget = self._get_monthly_budget()

        if not monthly_budget or monthly_budget <= 0:
            return {
                'score': 0,
                'max': self.MAX_CONSISTENCY_SCORE,
                'details': {
                    'monthly_budget': 0,
                    'threshold': 0,
                    'std_deviation': 0,
                    'days_with_spending': 0,
                    'message': '예산이 설정되지 않았습니다.'
                }
            }

        monthly_budget_float = float(monthly_budget)
        threshold = (monthly_budget_float / 30) * 2

        start_date, end_date = self._get_month_date_range()

        # 일별 지출 합계 (무지출 제외)
        daily_spending = Transaction.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lt=end_date
        ).values('date__date').annotate(
            daily_total=Sum('amount')
        ).filter(daily_total__gt=0)

        daily_amounts = [d['daily_total'] for d in daily_spending]

        if not daily_amounts:
            return {
                'score': self.MAX_CONSISTENCY_SCORE,
                'max': self.MAX_CONSISTENCY_SCORE,
                'details': {
                    'monthly_budget': int(monthly_budget_float),
                    'threshold': int(threshold),
                    'std_deviation': 0,
                    'days_with_spending': 0,
                    'message': '지출 데이터가 없어 만점 처리됩니다.'
                }
            }
        
        # 표준편차 계산
        if len(daily_amounts) == 1:
            std_deviation = 0.0
        else:
            std_deviation = statistics.stdev([float(x) for x in daily_amounts])
        
        # 점수 계산
        if threshold == 0:
            score = 0
        else:
            raw_score = (1 - (std_deviation / threshold)) * self.MAX_CONSISTENCY_SCORE
            score = int(max(0, raw_score))
        
        return {
            'score': score,
            'max': self.MAX_CONSISTENCY_SCORE,
            'details': {
                'monthly_budget': int(monthly_budget_float),
                'threshold': int(threshold),
                'std_deviation': int(std_deviation),
                'days_with_spending': len(daily_amounts),
                'avg_daily_spending': int(sum(daily_amounts) / len(daily_amounts))
            }
        }
    
    def _calculate_challenge_success(self) -> dict:
        """
        4. 챌린지 성공 (3점)
        
        - 2회 이상 성공: 3점
        - 1회 성공: 2점
        - 0회: 0점
        """
        from apps.challenges.models import UserChallenge
        
        start_date, end_date = self._get_month_date_range()
        
        success_count = UserChallenge.objects.filter(
            user=self.user,
            status='completed',
            completed_at__gte=start_date,
            completed_at__lt=end_date
        ).count()
        
        if success_count >= 2:
            score = 3
        elif success_count == 1:
            score = 2
        else:
            score = 0
        
        return {
            'score': score,
            'max': self.MAX_CHALLENGE_SCORE,
            'details': {
                'success_count': success_count,
                'required_for_full_score': 2
            }
        }
    
    def _get_monthly_budget(self):
        """해당 월의 예산 가져오기"""
        if self._monthly_budget is not None:
            return self._monthly_budget
            
        from apps.transactions.models import MonthlyLog
        
        monthly_log = MonthlyLog.objects.filter(
            user=self.user,
            year=self.year,
            month=self.month
        ).values_list('monthly_budget', flat=True).first()
        
        if monthly_log:
            self._monthly_budget = Decimal(monthly_log)
        else:
            self._monthly_budget = self.user.monthly_budget or Decimal(0)
            
        return self._monthly_budget
    
    def _get_month_date_range(self) -> tuple:
        """해당 월의 시작일과 종료일 반환"""
        if self._date_range is not None:
            return self._date_range
            
        start_date = timezone.make_aware(datetime(self.year, self.month, 1))
        
        if self.month == 12:
            end_date = timezone.make_aware(datetime(self.year + 1, 1, 1))
        else:
            end_date = timezone.make_aware(datetime(self.year, self.month + 1, 1))
        
        self._date_range = (start_date, end_date)
        return self._date_range


def get_yuntaek_score(user, year: int = None, month: int = None) -> dict:
    """
    윤택지수 조회 헬퍼 함수
    
    Args:
        user: User 모델 인스턴스
        year: 대상 연도 (기본값: 현재 연도)
        month: 대상 월 (기본값: 현재 월)
    
    Returns:
        dict: 윤택지수 결과
    """
    today = date.today()
    
    if year is None:
        year = today.year
    if month is None:
        month = today.month
    
    calculator = YuntaekScoreCalculator(user, year, month)
    return calculator.calculate()
