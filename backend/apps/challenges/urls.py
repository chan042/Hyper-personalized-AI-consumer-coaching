from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChallengeViewSet, 
    UserChallengeViewSet,
    UserPointsView,
    ChallengeProgressUpdateView
)

router = DefaultRouter()
router.register(r'list', ChallengeViewSet, basename='challenge')
router.register(r'my', UserChallengeViewSet, basename='user-challenge')

urlpatterns = [
    path('', include(router.urls)),
    path('points/', UserPointsView.as_view(), name='user-points'),
    path('progress-update/', ChallengeProgressUpdateView.as_view(), name='challenge-progress-update'),
]
