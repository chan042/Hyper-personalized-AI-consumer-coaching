import logging

from django.db import transaction as db_transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.transactions.models import Transaction

from .services import schedule_coaching_generation_requests


logger = logging.getLogger(__name__)


def _schedule_coaching_generation_requests_safely(user_id):
    try:
        schedule_coaching_generation_requests(user_id)
    except Exception:
        logger.exception(
            "Failed to enqueue coaching generation requests after transaction save (user_id=%s)",
            user_id,
        )


@receiver(post_save, sender=Transaction)
def enqueue_coaching_generation_if_needed(sender, instance, created, **kwargs):
    """
    소비 저장이 커밋된 뒤 코칭 생성 요청 배치를 DB에 적재하고,
    실제 AI 코칭 생성은 Celery가 백그라운드에서 처리한다.
    """
    if not created:
        return

    user_id = instance.user_id
    db_transaction.on_commit(
        lambda: _schedule_coaching_generation_requests_safely(user_id)
    )
