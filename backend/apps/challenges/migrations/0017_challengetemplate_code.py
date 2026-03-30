from django.db import migrations, models


CHALLENGE_TEMPLATE_CODES = {
    "3만원의 행복": "thirty_thousand_happiness",
    "나와의 싸움": "fight_with_myself",
    "3일 연속 무지출 챌린지": "three_day_zero_spend",
    "현금 챌린지": "cash_challenge",
    "외식/배달 X": "no_dining_delivery",
    "원플원러버": "one_plus_one_lover",
    "집구석 보물찾기": "home_treasure_hunt",
    "고정비 다이어트": "fixed_cost_diet",
    "내 소비 맞추기": "guess_my_spending",
    "미라클 두둑!": "miracle_duduk",
    "무00의 날": "no_x_day",
    "미래의 나에게": "for_future_me",
    "두근두근 데스게임": "thrilling_death_game",
}


def populate_template_codes(apps, schema_editor):
    ChallengeTemplate = apps.get_model("challenges", "ChallengeTemplate")

    for template in ChallengeTemplate.objects.filter(name__in=CHALLENGE_TEMPLATE_CODES).iterator():
        code = CHALLENGE_TEMPLATE_CODES.get(template.name)
        if code and template.code != code:
            template.code = code
            template.save(update_fields=["code"])


class Migration(migrations.Migration):
    dependencies = [
        ("challenges", "0016_remove_unused_challengetemplate_event_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="challengetemplate",
            name="code",
            field=models.CharField(blank=True, db_index=True, max_length=100, null=True, verbose_name="챌린지 코드"),
        ),
        migrations.RunPython(populate_template_codes, migrations.RunPython.noop),
    ]
