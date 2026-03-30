from django.db.models import F

from apps.battles.models import BattleReward


def grant_battle_reward(battle, user, reason, points):
    reward, created = BattleReward.objects.get_or_create(
        battle=battle,
        user=user,
        reason=reason,
        defaults={"points": points},
    )
    if created and points:
        user.__class__.objects.filter(pk=user.pk).update(
            points=F("points") + points,
            total_points_earned=F("total_points_earned") + points,
        )
    return reward, created
