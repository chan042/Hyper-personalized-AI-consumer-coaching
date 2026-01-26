#!/usr/bin/env python
"""
[파일 역할]
- Django 프로젝트의 관리 작업을 수행하는 커맨드라인 유틸리티입니다.
- 서버 실행, 마이그레이션, 앱 생성 등의 명령어를 처리합니다.
- 사용법: python manage.py <command> (예: python manage.py runserver)
"""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
