from django.urls import path

from apps.battles.views import (
    BattleCurrentProgressView,
    BattleCurrentView,
    BattleEntryView,
    BattleProfileIssueCodeView,
    BattleProfileMeView,
    BattleResultConfirmView,
    BattleResultView,
    BattleRequestAcceptView,
    BattleRequestCancelView,
    BattleRequestCreateView,
    BattleRequestRejectView,
    BattleUserLookupView,
)


urlpatterns = [
    path("profile/me/", BattleProfileMeView.as_view(), name="battle_profile_me"),
    path("profile/issue-code/", BattleProfileIssueCodeView.as_view(), name="battle_profile_issue_code"),
    path("users/lookup/", BattleUserLookupView.as_view(), name="battle_user_lookup"),
    path("current/progress/", BattleCurrentProgressView.as_view(), name="battle_current_progress"),
    path("current/", BattleCurrentView.as_view(), name="battle_current"),
    path("requests/", BattleRequestCreateView.as_view(), name="battle_request_create"),
    path("<int:battle_id>/accept/", BattleRequestAcceptView.as_view(), name="battle_request_accept"),
    path("<int:battle_id>/reject/", BattleRequestRejectView.as_view(), name="battle_request_reject"),
    path("<int:battle_id>/cancel/", BattleRequestCancelView.as_view(), name="battle_request_cancel"),
    path("<int:battle_id>/result/", BattleResultView.as_view(), name="battle_result"),
    path("<int:battle_id>/confirm-result/", BattleResultConfirmView.as_view(), name="battle_result_confirm"),
    path("entry/", BattleEntryView.as_view(), name="battle_entry"),
]
