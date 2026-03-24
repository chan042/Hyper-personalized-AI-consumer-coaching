from django.contrib import admin

from .models import (
    BattleMission,
    BattleMissionTemplate,
    BattleParticipant,
    BattleProfile,
    BattleReward,
    YuntaekBattle,
)


@admin.register(BattleProfile)
class BattleProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "battle_code", "is_enabled", "active_battle", "pending_result_battle")
    search_fields = ("user__username", "user__email", "battle_code")
    list_filter = ("is_enabled",)


@admin.register(YuntaekBattle)
class YuntaekBattleAdmin(admin.ModelAdmin):
    list_display = ("id", "requester", "opponent", "category", "status", "target_year", "target_month", "winner")
    list_filter = ("status", "category", "target_year", "target_month", "is_draw")
    search_fields = ("pair_key", "requester__username", "requester__email", "opponent__username", "opponent__email")


@admin.register(BattleParticipant)
class BattleParticipantAdmin(admin.ModelAdmin):
    list_display = ("battle", "user", "role", "mission_won_count", "mission_bonus_score", "final_score", "result_seen_at")
    list_filter = ("role",)
    search_fields = ("user__username", "user__email")


@admin.register(BattleMissionTemplate)
class BattleMissionTemplateAdmin(admin.ModelAdmin):
    list_display = ("id", "category", "display_order", "title", "verification_type", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("title",)


@admin.register(BattleMission)
class BattleMissionAdmin(admin.ModelAdmin):
    list_display = ("id", "battle", "title_snapshot", "status", "winner", "point_value", "won_at")
    list_filter = ("status",)
    search_fields = ("title_snapshot",)


@admin.register(BattleReward)
class BattleRewardAdmin(admin.ModelAdmin):
    list_display = ("battle", "user", "reason", "points", "created_at")
    list_filter = ("reason",)
    search_fields = ("user__username", "user__email")

