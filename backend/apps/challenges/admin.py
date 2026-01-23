from django.contrib import admin
from .models import Challenge, UserChallenge

"""
Challenges 관리자(Admin) 설정 파일

이 파일은 Django 관리자 페이지(Admin Site)에서 챌린지 관련 모델들을 
어떻게 표시하고 관리할지 설정합니다.
"""

@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    """
    챌린지 관리 (두둑, 이벤트, AI)
    - 목록 조회: 이름, 출처, 난이도, 포인트, 활성 상태
    - 필터링: 출처, 난이도, 활성 상태
    """
    list_display = ['name', 'source', 'difficulty', 'points', 'is_active', 'user', 'created_at']
    list_filter = ['source', 'difficulty', 'is_active', 'keyword']
    search_fields = ['name', 'description', 'user__username']
    ordering = ['-created_at']


@admin.register(UserChallenge)
class UserChallengeAdmin(admin.ModelAdmin):
    """
    사용자별 챌린지 참여 현황 관리
    - 사용자가 어떤 챌린지에 참여 중인지, 성공/실패 여부를 관리
    - get_challenge_name: 일반 챌린지와 AI 챌린지를 구분하여 이름 표시
    """
    list_display = ['user', 'get_challenge_name', 'status', 'started_at', 'end_date', 'points_earned']
    list_filter = ['status', 'started_at']
    search_fields = ['user__username', 'challenge__name']
    ordering = ['-started_at']

    def get_challenge_name(self, obj):
        return obj.challenge.name if obj.challenge else '-'
    get_challenge_name.short_description = '챌린지'
