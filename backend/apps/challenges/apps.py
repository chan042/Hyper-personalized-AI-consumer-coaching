from django.apps import AppConfig


class ChallengesConfig(AppConfig):
    """
    Challenges 앱 설정 클래스
    - Django 프로젝트 내에서 'challenges' 앱의 메타데이터와 초기화 설정을 담당
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.challenges'
    verbose_name = '챌린지'

    def ready(self):
        """
        앱 초기화 시 호출되는 메서드
        """
        import apps.challenges.signals
