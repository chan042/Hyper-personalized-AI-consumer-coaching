from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


def _retention_cutoff():
    return timezone.now() - timedelta(days=Notification.RETENTION_DAYS)


class NotificationListView(APIView):
    """
    사용자의 만료되지 않은 알림 목록 조회.
    GET /api/notifications/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(
            user=request.user,
            created_at__gte=_retention_cutoff(),
        ).order_by("-created_at")

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationReadView(APIView):
    """
    알림 읽음 처리.
    PATCH /api/notifications/<pk>/read/
    PATCH /api/notifications/read/
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk=None):
        if pk:
            try:
                notification = Notification.objects.get(id=pk, user=request.user)
            except Notification.DoesNotExist:
                return Response(
                    {"error": "알림을 찾을 수 없습니다."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            notification.is_read = True
            notification.save(update_fields=["is_read"])
            return Response({"message": "알림을 읽음 처리했습니다."})

        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "모든 알림을 읽음 처리했습니다."})


class NotificationCountView(APIView):
    """
    읽지 않은 만료되지 않은 알림 개수 조회.
    GET /api/notifications/count/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread_count = Notification.objects.filter(
            user=request.user,
            is_read=False,
            created_at__gte=_retention_cutoff(),
        ).count()

        return Response({"unread_count": unread_count})
