"""
[파일 역할]
- 이 디렉토리를 Python 패키지로 인식하게 만드는 파일입니다.
- Celery 설정 등을 여기에 추가하기도 합니다.
"""

# Celery 앱 로드 (Django가 시작될 때 Celery도 함께 시작)
from __future__ import absolute_import, unicode_literals

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery import app as celery_app

__all__ = ('celery_app',)