from rest_framework import serializers

from apps.battles.models import YuntaekBattle


class BattleSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    category = serializers.CharField()
    target_year = serializers.IntegerField()
    target_month = serializers.IntegerField()


class BattleProfileSerializer(serializers.Serializer):
    battle_code = serializers.CharField()
    display_name = serializers.CharField()
    character_type = serializers.CharField()
    is_enabled = serializers.BooleanField()
    active_battle = BattleSummarySerializer(allow_null=True)
    pending_result_battle = BattleSummarySerializer(allow_null=True)


class BattleLookupSerializer(serializers.Serializer):
    battle_code = serializers.CharField()
    display_name = serializers.CharField()
    character_type = serializers.CharField()


class BattleRequestCreateSerializer(serializers.Serializer):
    opponent_battle_code = serializers.CharField()
    category = serializers.ChoiceField(choices=[choice[0] for choice in YuntaekBattle.Category.choices])


class BattleEntrySerializer(serializers.Serializer):
    battle_id = serializers.IntegerField(required=False, allow_null=True)
    next_screen = serializers.CharField()
    path = serializers.CharField()
    view_mode = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    opponent_display_name = serializers.CharField(required=False, allow_blank=True)
    opponent_battle_code = serializers.CharField(required=False, allow_blank=True)
    opponent_character_type = serializers.CharField(required=False)
    request_deadline_at = serializers.DateTimeField(required=False, allow_null=True)
    can_accept = serializers.BooleanField(required=False)
    can_reject = serializers.BooleanField(required=False)
    can_cancel = serializers.BooleanField(required=False)


class BattleCurrentSerializer(serializers.Serializer):
    battle_id = serializers.IntegerField()
    status = serializers.CharField()
    category = serializers.CharField()
    target_year = serializers.IntegerField()
    target_month = serializers.IntegerField()
    state_version = serializers.IntegerField()
    opponent_display_name = serializers.CharField()


class BattleProgressParticipantSerializer(serializers.Serializer):
    name = serializers.CharField()
    character_type = serializers.CharField()
    mission_won_count = serializers.IntegerField()
    mission_bonus_score = serializers.IntegerField()
    current_score = serializers.IntegerField()


class BattleProgressMissionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    winner_name = serializers.CharField(allow_null=True)
    point_value = serializers.IntegerField()


class BattleProgressSerializer(serializers.Serializer):
    battle_id = serializers.IntegerField()
    status = serializers.CharField()
    category = serializers.CharField()
    target_year = serializers.IntegerField()
    target_month = serializers.IntegerField()
    state_version = serializers.IntegerField()
    d_day = serializers.IntegerField()
    battle_end_at = serializers.DateTimeField(allow_null=True)
    score_expected_at = serializers.DateTimeField(allow_null=True)
    result_ready = serializers.BooleanField()
    me = BattleProgressParticipantSerializer()
    opponent = BattleProgressParticipantSerializer()
    missions = BattleProgressMissionSerializer(many=True)


class BattleResultParticipantSerializer(serializers.Serializer):
    name = serializers.CharField()
    character_type = serializers.CharField()
    mission_won_count = serializers.IntegerField()
    mission_bonus_score = serializers.IntegerField()
    official_base_score = serializers.IntegerField(allow_null=True)
    final_score = serializers.IntegerField(allow_null=True)
    official_score_snapshot = serializers.JSONField()


class BattleResultMissionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    description = serializers.CharField()
    status = serializers.CharField()
    winner_name = serializers.CharField(allow_null=True)
    point_value = serializers.IntegerField()


class BattleResultSerializer(serializers.Serializer):
    battle_id = serializers.IntegerField()
    status = serializers.CharField()
    category = serializers.CharField()
    target_year = serializers.IntegerField()
    target_month = serializers.IntegerField()
    result_ready = serializers.BooleanField()
    is_draw = serializers.BooleanField(required=False)
    winner_name = serializers.CharField(required=False, allow_null=True)
    my_outcome = serializers.CharField(required=False)
    completed_at = serializers.DateTimeField(required=False, allow_null=True)
    delay_reason_code = serializers.CharField(required=False)
    delay_message = serializers.CharField(required=False)
    me = BattleResultParticipantSerializer(required=False)
    opponent = BattleResultParticipantSerializer(required=False)
    missions = BattleResultMissionSerializer(many=True, required=False)
