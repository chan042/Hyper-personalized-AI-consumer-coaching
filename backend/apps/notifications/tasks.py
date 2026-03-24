from celery import shared_task

from apps.notifications.services import cleanup_old_notifications


@shared_task
def cleanup_old_notifications_task():
    deleted_count = cleanup_old_notifications()
    return {
        "deleted_count": deleted_count,
    }
