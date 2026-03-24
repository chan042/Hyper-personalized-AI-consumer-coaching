import logging

from celery import shared_task

from .services import process_pending_coaching_generation_requests


logger = logging.getLogger(__name__)


@shared_task
def run_coaching_generation_queue(user_id):
    logger.info("Run coaching generation queue task started (user_id=%s)", user_id)
    result = process_pending_coaching_generation_requests(user_id)
    logger.info("Run coaching generation queue task completed: %s", result)
    return result
