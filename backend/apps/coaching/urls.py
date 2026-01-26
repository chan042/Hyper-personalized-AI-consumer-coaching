from django.urls import path
from .views import CoachingAdviceView, FeedbackView

urlpatterns = [
    path('advice/', CoachingAdviceView.as_view(), name='coaching_advice'),
    path('feedback/', FeedbackView.as_view(), name='coaching_feedback'),
]
