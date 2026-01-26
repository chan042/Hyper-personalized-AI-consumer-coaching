"""
[파일 역할]
- 사용자 인증 관련 API 뷰를 정의합니다.
- 회원가입, 프로필 조회 기능을 제공합니다.
- 로그인은 SimpleJWT의 TokenObtainPairView를 사용합니다.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .serializers import UserSerializer, RegisterSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    회원가입 API
    POST /api/users/register/
    
    요청 본문:
    {
        "email": "user@example.com",
        "username": "사용자명",
        "password": "비밀번호",
        "password_confirm": "비밀번호 확인"
    }
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            "message": "회원가입이 완료되었습니다.",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    """
    사용자 프로필 조회/수정/삭제 API
    GET /api/users/profile/ - 현재 로그인한 사용자 정보 조회
    PATCH /api/users/profile/ - 사용자 정보 수정
    DELETE /api/users/profile/ - 회원 탈퇴 (관련 데이터 모두 삭제)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        """
        회원 탈퇴 API
        사용자 삭제 시 관련된 모든 데이터(Transaction, Coaching 등)가 CASCADE로 자동 삭제됩니다.
        """
        user = request.user
        user_email = user.email
        
        # 사용자 삭제 (ForeignKey CASCADE로 관련 데이터 자동 삭제)
        user.delete()
        
        return Response({
            "message": f"'{user_email}' 계정이 성공적으로 삭제되었습니다."
        }, status=status.HTTP_200_OK)
