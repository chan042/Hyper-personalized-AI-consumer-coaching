import uuid

from django.db import migrations, models


def backfill_attempt_grouping(apps, schema_editor):
    UserChallenge = apps.get_model("challenges", "UserChallenge")
    challenges = list(
        UserChallenge.objects.all().order_by("created_at", "id")
    )
    challenge_map = {challenge.id: challenge for challenge in challenges}
    grouped = {}

    def resolve_root(challenge):
        current = challenge
        visited = set()
        while current.previous_attempt_id and current.previous_attempt_id in challenge_map:
            if current.id in visited:
                break
            visited.add(current.id)
            current = challenge_map[current.previous_attempt_id]
        return current

    for challenge in challenges:
        root = resolve_root(challenge)
        group_id = root.attempt_group_id or uuid.uuid4()
        if challenge.attempt_group_id != group_id:
            challenge.attempt_group_id = group_id
        grouped.setdefault(group_id, []).append(challenge)

    for attempts in grouped.values():
        attempts.sort(key=lambda challenge: (challenge.created_at, challenge.id))
        latest_id = attempts[-1].id
        for challenge in attempts:
            challenge.is_current_attempt = challenge.id == latest_id

    UserChallenge.objects.bulk_update(
        challenges,
        ["attempt_group_id", "is_current_attempt"],
    )


class Migration(migrations.Migration):

    dependencies = [
        ("challenges", "0012_alter_userchallenge_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="userchallenge",
            name="attempt_group_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, verbose_name="시도 그룹 ID"),
        ),
        migrations.AddField(
            model_name="userchallenge",
            name="is_current_attempt",
            field=models.BooleanField(default=True, verbose_name="현재 시도 여부"),
        ),
        migrations.RunPython(backfill_attempt_grouping, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name="userchallenge",
            index=models.Index(fields=["user", "status", "is_current_attempt"], name="chal_usr_stat_curr_idx"),
        ),
        migrations.AddIndex(
            model_name="userchallenge",
            index=models.Index(fields=["attempt_group_id"], name="chal_attempt_grp_idx"),
        ),
    ]
