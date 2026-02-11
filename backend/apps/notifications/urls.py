from django.urls import path
from .views import NotificationListView, NotificationReadView, NotificationCountView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('read/', NotificationReadView.as_view(), name='notification_read_all'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification_read'),
    path('count/', NotificationCountView.as_view(), name='notification_count'),
]
