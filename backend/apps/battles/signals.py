from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.battles.services import evaluate_active_battle_missions_for_user
from apps.challenges.models import UserChallenge
from apps.transactions.models import Transaction


def _schedule_battle_mission_evaluation(user_id, *, trigger_transaction_id=None):
    observed_at = timezone.now()
    transaction.on_commit(
        lambda: evaluate_active_battle_missions_for_user(
            user_id,
            trigger_transaction_id=trigger_transaction_id,
            observed_at=observed_at,
        )
    )


@receiver(post_save, sender=Transaction)
def evaluate_battle_missions_after_transaction_save(sender, instance, **kwargs):
    _schedule_battle_mission_evaluation(instance.user_id, trigger_transaction_id=instance.id)


@receiver(post_delete, sender=Transaction)
def evaluate_battle_missions_after_transaction_delete(sender, instance, **kwargs):
    _schedule_battle_mission_evaluation(instance.user_id)


@receiver(post_save, sender=UserChallenge)
def evaluate_battle_missions_after_challenge_save(sender, instance, **kwargs):
    _schedule_battle_mission_evaluation(instance.user_id)
