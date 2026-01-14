"""
[파일 역할]
- 사용자 인증 관련 API URL 라우팅을 정의합니다.
- 회원가입, 로그인, 토큰 갱신, 프로필 조회 엔드포인트를 제공합니다.
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import RegisterView, ProfileView

urlpatterns = [
    # 회원가입
    path('register/', RegisterView.as_view(), name='register'),
    
    # 로그인 (JWT 토큰 발급)
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # 토큰 갱신
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 프로필 조회/수정
    path('profile/', ProfileView.as_view(), name='profile'),
]
