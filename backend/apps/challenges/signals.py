from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.transactions.models import Transaction
from .models import UserChallenge


@receiver(post_save, sender=Transaction)
def update_challenge_progress_on_transaction(sender, instance, created, **kwargs):
    """
    새로운 Transaction 생성 시 관련 챌린지 진행 상황 자동 업데이트
    """
    if not created:
        return
    
    user = instance.user
    category = instance.category
    amount = instance.amount
    
    # 진행 중인 챌린지 조회
    in_progress_challenges = UserChallenge.objects.filter(
        user=user,
        status='IN_PROGRESS'
    )
    
    for uc in in_progress_challenges:
        target_category = uc.challenge.target_category if uc.challenge else None
        
        # 카테고리 필터가 있으면 해당하는 경우만 업데이트
        if target_category and target_category != category:
            continue
        
        # 지출 금액 추가
        uc.current_spent += amount
        uc.save()
        
        # 목표 초과 시 즉시 실패 처리 (0원 챌린지는 어떤 지출이든 실패)
        if uc.target_amount == 0 and amount > 0:
            from django.utils import timezone
            uc.status = 'FAILED'
            uc.completed_at = timezone.now()
            uc.save()
        elif uc.target_amount > 0 and uc.current_spent > uc.target_amount:
            from django.utils import timezone
            uc.status = 'FAILED'
            uc.completed_at = timezone.now()
            uc.save()
