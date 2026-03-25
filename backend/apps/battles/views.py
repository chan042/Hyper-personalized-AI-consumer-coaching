from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.battles.models import BattleProfile
from apps.battles.serializers import (
    BattleCurrentSerializer,
    BattleEntrySerializer,
    BattleLookupSerializer,
    BattleProgressSerializer,
    BattleProfileSerializer,
    BattleResultSerializer,
    BattleRequestCreateSerializer,
)
from apps.battles.services import (
    accept_battle_request,
    cancel_battle_request,
    confirm_battle_result,
    create_battle_request,
    expire_overdue_requested_battles,
    get_battle_result,
    get_battle_display_name,
    get_battle_entry,
    get_current_battle_progress,
    get_current_battle_summary,
    get_or_create_battle_profile,
    issue_new_battle_code,
    reject_battle_request,
    serialize_battle_summary,
)


class BattleProfileMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        expire_overdue_requested_battles(limit=20)
        profile = get_or_create_battle_profile(request.user)
        payload = {
            "battle_code": profile.battle_code,
            "display_name": get_battle_display_name(request.user),
            "character_type": request.user.character_type,
            "is_enabled": profile.is_enabled,
            "active_battle": serialize_battle_summary(profile.active_battle),
            "pending_result_battle": serialize_battle_summary(profile.pending_result_battle),
        }
        serializer = BattleProfileSerializer(payload)
        return Response(serializer.data)


class BattleProfileIssueCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        expire_overdue_requested_battles(limit=20)
        profile = issue_new_battle_code(request.user)
        payload = {
            "battle_code": profile.battle_code,
            "display_name": get_battle_display_name(request.user),
            "character_type": request.user.character_type,
            "is_enabled": profile.is_enabled,
            "active_battle": serialize_battle_summary(profile.active_battle),
            "pending_result_battle": serialize_battle_summary(profile.pending_result_battle),
        }
        serializer = BattleProfileSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BattleUserLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        expire_overdue_requested_battles(limit=20)
        raw_battle_code = (request.query_params.get("battle_code") or "").strip().upper()
        if not raw_battle_code:
            raise ValidationError({"battle_code": "battle_code query parameter is required."})

        my_profile = get_or_create_battle_profile(request.user)
        if my_profile.battle_code == raw_battle_code:
            raise ValidationError({"code": "SELF_CHALLENGE_NOT_ALLOWED"})

        profile = (
            BattleProfile.objects.select_related("user")
            .filter(battle_code=raw_battle_code, is_enabled=True)
            .exclude(user=request.user)
            .first()
        )
        if not profile:
            raise NotFound(detail="Battle user not found.")

        payload = {
            "battle_code": profile.battle_code,
            "display_name": get_battle_display_name(profile.user),
            "character_type": profile.user.character_type,
        }
        serializer = BattleLookupSerializer(payload)
        return Response(serializer.data)


class BattleEntryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = get_battle_entry(request.user)
        serializer = BattleEntrySerializer(payload)
        return Response(serializer.data)


class BattleCurrentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = get_current_battle_summary(request.user)
        serializer = BattleCurrentSerializer(payload)
        return Response(serializer.data)


class BattleCurrentProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = get_current_battle_progress(request.user)
        serializer = BattleProgressSerializer(payload)
        return Response(serializer.data)


class BattleRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BattleRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        battle = create_battle_request(
            requester=request.user,
            opponent_battle_code=serializer.validated_data["opponent_battle_code"],
            category=serializer.validated_data["category"],
        )
        entry_payload = get_battle_entry(request.user)
        response_serializer = BattleEntrySerializer(entry_payload)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BattleRequestAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, battle_id):
        accept_battle_request(request.user, battle_id)
        entry_payload = get_battle_entry(request.user)
        serializer = BattleEntrySerializer(entry_payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BattleRequestRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, battle_id):
        reject_battle_request(request.user, battle_id)
        entry_payload = get_battle_entry(request.user)
        serializer = BattleEntrySerializer(entry_payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BattleRequestCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, battle_id):
        cancel_battle_request(request.user, battle_id)
        entry_payload = get_battle_entry(request.user)
        serializer = BattleEntrySerializer(entry_payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BattleResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, battle_id):
        payload = get_battle_result(request.user, battle_id)
        serializer = BattleResultSerializer(payload)
        return Response(serializer.data)


class BattleResultConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, battle_id):
        payload = confirm_battle_result(request.user, battle_id)
        return Response(payload, status=status.HTTP_200_OK)
