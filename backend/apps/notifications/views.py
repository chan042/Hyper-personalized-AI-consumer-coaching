from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    사용자의 알림 목록 조회 (만료되지 않은 알림만)
    GET /api/notifications/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # 1개월 이내의 알림만 조회
        one_month_ago = timezone.now() - timedelta(days=30)
        notifications = Notification.objects.filter(
            user=request.user,
            created_at__gte=one_month_ago
        ).order_by('-created_at')
        
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationReadView(APIView):
    """
    알림 읽음 처리
    PATCH /api/notifications/<pk>/read/ - 특정 알림 읽음
    PATCH /api/notifications/read/ - 전체 알림 읽음
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk=None):
        if pk:
            # 특정 알림 읽음 처리
            try:
                notification = Notification.objects.get(id=pk, user=request.user)
                notification.is_read = True
                notification.save()
                return Response({'message': '알림을 읽음 처리했습니다.'})
            except Notification.DoesNotExist:
                return Response(
                    {'error': '알림을 찾을 수 없습니다.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # 전체 알림 읽음 처리
            Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(is_read=True)
            return Response({'message': '모든 알림을 읽음 처리했습니다.'})


class NotificationCountView(APIView):
    """
    읽지 않은 알림 개수 조회 (만료되지 않은 알림만)
    GET /api/notifications/count/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        one_month_ago = timezone.now() - timedelta(days=30)
        unread_count = Notification.objects.filter(
            user=request.user,
            is_read=False,
            created_at__gte=one_month_ago
        ).count()
        
        return Response({'unread_count': unread_count})
