import logging

from celery import shared_task

from apps.battles.services import (
    expire_overdue_requested_battles,
    finalize_waiting_battles,
    settle_battle_category_zero_spend,
    transition_ended_battles_to_waiting,
)


logger = logging.getLogger(__name__)


@shared_task
def expire_requested_battles():
    return expire_overdue_requested_battles()


@shared_task
def run_battle_zero_spend_settlement(run_date=None, dry_run=False):
    logger.info(
        "Run battle zero-spend settlement task started (date=%s, dry_run=%s)",
        run_date,
        dry_run,
    )
    result = settle_battle_category_zero_spend(reference_date=run_date, dry_run=dry_run)
    logger.info("Run battle zero-spend settlement task completed: %s", result)
    return result


@shared_task
def run_battle_score_transition():
    logger.info("Run battle score transition task started")
    result = transition_ended_battles_to_waiting()
    logger.info("Run battle score transition task completed: %s", result)
    return result


@shared_task
def run_battle_result_finalization():
    logger.info("Run battle result finalization task started")
    result = finalize_waiting_battles()
    logger.info("Run battle result finalization task completed: %s", result)
    return result
