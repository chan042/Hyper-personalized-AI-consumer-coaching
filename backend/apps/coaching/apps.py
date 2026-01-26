from django.apps import AppConfig

class CoachingConfig(AppConfig):
    """
    Coaching 앱의 설정 클래스
    - 앱이 시작될 때 실행해야 할 초기화 작업을 정의합니다.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.coaching'

    def ready(self):
        """
        앱이 준비(Ready) 상태가 되었을 때 호출되는 메서드
        - 여기서 Signal(자동 코칭 생성 로직)을 등록해야 작동합니다.
        """
        import apps.coaching.signals
