"""
ASGI config for duduk_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

"""
[파일 역할]
- ASGI(Asynchronous Server Gateway Interface) 호환 웹 서버(Daphne, Uvicorn 등)가 Django 프로젝트를 실행할 때 사용하는 진입점입니다.
- 비동기 요청(WebSocket 등) 처리가 필요할 때 사용됩니다.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
