"""
WSGI config for duduk_project project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

"""
[파일 역할]
- WSGI(Web Server Gateway Interface) 호환 웹 서버(Gunicorn 등)가 Django 프로젝트를 실행할 때 사용하는 진입점입니다.
- 일반적인 동기 방식의 웹 요청을 처리합니다.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
