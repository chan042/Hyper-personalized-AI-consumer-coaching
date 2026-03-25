from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("challenges", "0015_userchallenge_source_type_coaching"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE challenges_challengetemplate
                    DROP COLUMN IF EXISTS event_start_at,
                    DROP COLUMN IF EXISTS event_end_at,
                    DROP COLUMN IF EXISTS event_banner_url;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name="challengetemplate",
                    name="event_start_at",
                ),
                migrations.RemoveField(
                    model_name="challengetemplate",
                    name="event_end_at",
                ),
                migrations.RemoveField(
                    model_name="challengetemplate",
                    name="event_banner_url",
                ),
                migrations.AlterField(
                    model_name="challengetemplate",
                    name="source_type",
                    field=models.CharField(
                        choices=[("duduk", "두둑 챌린지")],
                        default="duduk",
                        max_length=20,
                        verbose_name="챌린지 출처",
                    ),
                ),
            ],
        ),
    ]
