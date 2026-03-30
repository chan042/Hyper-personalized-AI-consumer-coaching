"""
Celery configuration for the Django project.
"""

from __future__ import absolute_import, unicode_literals

import os

from celery import Celery
from celery.schedules import crontab


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("duduk_project")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "check-daily-challenges": {
        "task": "apps.challenges.tasks.run_daily_challenge_checks",
        "schedule": crontab(hour=0, minute=1),
    },
    "expire-requested-battles": {
        "task": "apps.battles.tasks.expire_requested_battles",
        "schedule": crontab(hour=0, minute=1, day_of_month=16),
    },
    "settle-battle-zero-spend-streaks": {
        "task": "apps.battles.tasks.run_battle_zero_spend_settlement",
        "schedule": crontab(hour=0, minute=1),
    },
    "transition-battles-to-waiting-for-score": {
        "task": "apps.battles.tasks.run_battle_score_transition",
        "schedule": crontab(hour=0, minute=0, day_of_month=1),
    },
    "finalize-waiting-battles": {
        "task": "apps.battles.tasks.run_battle_result_finalization",
        "schedule": crontab(minute=10),
    },
    "generate-monthly-reports": {
        "task": "apps.users.tasks.generate_monthly_reports_for_all_users",
        "schedule": crontab(hour=0, minute=0, day_of_month=1),
    },
    "cleanup-old-notifications": {
        "task": "apps.notifications.tasks.cleanup_old_notifications_task",
        "schedule": crontab(hour=3, minute=0),
    },
}

app.conf.timezone = "Asia/Seoul"


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
