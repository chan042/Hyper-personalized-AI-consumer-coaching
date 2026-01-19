from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta

from .models import Challenge, UserChallenge, AIGeneratedChallenge
from .serializers import (
    ChallengeSerializer, ChallengeListSerializer,
    UserChallengeSerializer, UserChallengeCreateSerializer,
    AIGeneratedChallengeSerializer, UserPointsSerializer
)
from apps.transactions.models import Transaction


class ChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    챌린지 조회 API
    
    GET /api/challenges/ - 챌린지 목록 (탭별 필터링)
    GET /api/challenges/<id>/ - 챌린지 상세
    POST /api/challenges/<id>/start/ - 챌린지 시작
    """
    queryset = Challenge.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ChallengeListSerializer
        return ChallengeSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tab = self.request.query_params.get('tab')
        
        if tab == 'duduk':
            queryset = queryset.filter(type='DUDUK')
        elif tab == 'event':
            queryset = queryset.filter(type='EVENT')
            # 이벤트 챌린지는 현재 활성 상태인 것만
            now = timezone.now()
            queryset = queryset.filter(
                event_start__lte=now,
                event_end__gte=now
            )
        
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """챌린지 시작"""
        challenge = self.get_object()
        user = request.user
        
        # 이미 진행 중인 동일 챌린지가 있는지 확인
        existing = UserChallenge.objects.filter(
            user=user,
            challenge=challenge,
            status='IN_PROGRESS'
        ).exists()
        
        if existing:
            return Response(
                {'error': '이미 진행 중인 챌린지입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # UserChallenge 생성
        end_date = timezone.now().date() + timedelta(days=challenge.duration_days)
        user_challenge = UserChallenge.objects.create(
            user=user,
            challenge=challenge,
            end_date=end_date,
            target_amount=challenge.target_amount or 0
        )
        
        serializer = UserChallengeSerializer(user_challenge)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserChallengeViewSet(viewsets.ModelViewSet):
    """
    사용자 챌린지 관리 API
    
    GET /api/challenges/my/ - 내 챌린지 목록
    GET /api/challenges/my/<id>/ - 내 챌린지 상세
    PUT /api/challenges/my/<id>/cancel/ - 챌린지 취소
    """
    serializer_class = UserChallengeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = UserChallenge.objects.filter(user=self.request.user)
        status_filter = self.request.query_params.get('status')
        
        if status_filter == 'in_progress':
            queryset = queryset.filter(status='IN_PROGRESS')
        elif status_filter == 'success':
            queryset = queryset.filter(status='SUCCESS')
        elif status_filter == 'failed':
            queryset = queryset.filter(status='FAILED')
        
        return queryset.order_by('-started_at')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """챌린지 취소"""
        user_challenge = self.get_object()
        
        if user_challenge.status != 'IN_PROGRESS':
            return Response(
                {'error': '진행 중인 챌린지만 취소할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_challenge.status = 'CANCELLED'
        user_challenge.completed_at = timezone.now()
        user_challenge.save()
        
        return Response({'message': '챌린지가 취소되었습니다.'})

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """진행 상황 수동 업데이트 (Transaction과 연동)"""
        user_challenge = self.get_object()
        
        if user_challenge.status != 'IN_PROGRESS':
            return Response(
                {'error': '진행 중인 챌린지만 업데이트할 수 있습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 챌린지 기간 내 해당 카테고리 지출 합계 계산
        target_category = None
        if user_challenge.challenge:
            target_category = user_challenge.challenge.target_category
        elif user_challenge.ai_challenge:
            target_category = user_challenge.ai_challenge.target_category
        
        transactions = Transaction.objects.filter(
            user=request.user,
            date__gte=user_challenge.started_at,
            date__lte=timezone.now()
        )
        
        if target_category:
            transactions = transactions.filter(category=target_category)
        
        total_spent = transactions.aggregate(total=Sum('amount'))['total'] or 0
        user_challenge.current_spent = total_spent
        user_challenge.save()
        
        # 챌린지 완료 여부 확인
        user_challenge.check_and_complete()
        
        serializer = UserChallengeSerializer(user_challenge)
        return Response(serializer.data)


class AIGeneratedChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    AI 맞춤 챌린지 조회 API
    
    GET /api/challenges/ai/ - AI 맞춤 챌린지 목록
    GET /api/challenges/ai/<id>/ - AI 맞춤 챌린지 상세
    POST /api/challenges/ai/<id>/start/ - AI 챌린지 시작
    """
    serializer_class = AIGeneratedChallengeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AIGeneratedChallenge.objects.filter(
            user=self.request.user,
            is_active=True,
            is_started=False
        ).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """AI 맞춤 챌린지 시작"""
        ai_challenge = self.get_object()
        user = request.user
        
        if ai_challenge.is_started:
            return Response(
                {'error': '이미 시작된 챌린지입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # UserChallenge 생성
        end_date = timezone.now().date() + timedelta(days=ai_challenge.duration_days)
        user_challenge = UserChallenge.objects.create(
            user=user,
            ai_challenge=ai_challenge,
            end_date=end_date,
            target_amount=ai_challenge.target_amount or 0
        )
        
        # AI 챌린지 상태 업데이트
        ai_challenge.is_started = True
        ai_challenge.save()
        
        serializer = UserChallengeSerializer(user_challenge)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserPointsView(APIView):
    """
    사용자 포인트 조회 API
    
    GET /api/challenges/points/ - 내 포인트 조회
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        data = {
            'points': user.points,
            'total_points_earned': user.total_points_earned,
            'total_points_used': user.total_points_used
        }
        serializer = UserPointsSerializer(data)
        return Response(serializer.data)


class ChallengeProgressUpdateView(APIView):
    """
    Transaction 생성 시 호출되어 진행 중인 챌린지 업데이트
    (내부 호출용)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """새 거래 발생 시 관련 챌린지 진행 상황 업데이트"""
        user = request.user
        category = request.data.get('category')
        amount = request.data.get('amount', 0)
        
        # 진행 중인 챌린지 조회
        in_progress_challenges = UserChallenge.objects.filter(
            user=user,
            status='IN_PROGRESS'
        )
        
        updated_challenges = []
        for uc in in_progress_challenges:
            target_category = None
            if uc.challenge:
                target_category = uc.challenge.target_category
            elif uc.ai_challenge:
                target_category = uc.ai_challenge.target_category
            
            # 카테고리 필터가 있으면 해당하는 경우만 업데이트
            if target_category and target_category != category:
                continue
            
            # 지출 금액 추가
            uc.current_spent += amount
            uc.save()
            
            # 목표 초과 시 즉시 실패 처리
            if uc.target_amount > 0 and uc.current_spent > uc.target_amount:
                uc.status = 'FAILED'
                uc.completed_at = timezone.now()
                uc.save()
            
            updated_challenges.append(uc.id)
        
        return Response({
            'message': f'{len(updated_challenges)}개의 챌린지가 업데이트되었습니다.',
            'updated_challenge_ids': updated_challenges
        })
