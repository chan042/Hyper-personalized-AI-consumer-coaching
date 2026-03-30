from django.db import migrations


CHALLENGE_TEMPLATE_CODES = {
    "3일 연속 무지출 챌린지": "three_day_zero_spend",
    "3만원의 행복": "thirty_thousand_happiness",
    "무00의 날": "no_x_day",
}


def _resolve_template_code(config, challenge_codes_by_id):
    template_code = config.get("template_code")
    if template_code:
        return template_code

    template_id = config.get("template_id")
    if template_id:
        resolved = challenge_codes_by_id.get(template_id)
        if resolved:
            return resolved

    template_name = config.get("template_name")
    if template_name:
        return CHALLENGE_TEMPLATE_CODES.get(template_name)

    return None


def populate_battle_challenge_template_codes(apps, schema_editor):
    BattleMissionTemplate = apps.get_model("battles", "BattleMissionTemplate")
    BattleMission = apps.get_model("battles", "BattleMission")
    ChallengeTemplate = apps.get_model("challenges", "ChallengeTemplate")

    challenge_codes_by_id = {
        template_id: code
        for template_id, code in ChallengeTemplate.objects.exclude(code__isnull=True).values_list("id", "code")
        if code
    }

    mission_templates = BattleMissionTemplate.objects.filter(verification_type="challenge_template_complete")
    for template in mission_templates.iterator():
        config = dict(template.verification_config or {})
        template_code = _resolve_template_code(config, challenge_codes_by_id)
        if not template_code:
            continue
        config["template_code"] = template_code
        config.pop("template_id", None)
        template.verification_config = config
        template.save(update_fields=["verification_config"])

    missions = BattleMission.objects.filter(template__verification_type="challenge_template_complete")
    for mission in missions.iterator():
        config = dict(mission.verification_snapshot or {})
        template_code = _resolve_template_code(config, challenge_codes_by_id)
        if not template_code:
            continue
        config["template_code"] = template_code
        config.pop("template_id", None)
        mission.verification_snapshot = config
        mission.save(update_fields=["verification_snapshot"])


class Migration(migrations.Migration):
    dependencies = [
        ("battles", "0001_initial"),
        ("challenges", "0017_challengetemplate_code"),
    ]

    operations = [
        migrations.RunPython(populate_battle_challenge_template_codes, migrations.RunPython.noop),
    ]
