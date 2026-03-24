from django.conf import settings
from django.db import migrations, models
from django.db.models import F, Q
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BattleMissionTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[("alternative", "Alternative"), ("growth", "Growth"), ("health", "Health"), ("challenge", "Challenge")], max_length=20, verbose_name="category")),
                ("title", models.CharField(max_length=200, verbose_name="title")),
                ("description", models.TextField(verbose_name="description")),
                ("verification_type", models.CharField(max_length=50, verbose_name="verification type")),
                ("verification_config", models.JSONField(blank=True, default=dict, verbose_name="verification config")),
                ("display_order", models.PositiveSmallIntegerField(verbose_name="display order")),
                ("is_active", models.BooleanField(default=True, verbose_name="is active")),
            ],
            options={
                "verbose_name": "battle mission template",
                "verbose_name_plural": "battle mission templates",
                "ordering": ["category", "display_order", "id"],
            },
        ),
        migrations.CreateModel(
            name="YuntaekBattle",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("REQUESTED", "Requested"), ("ACTIVE", "Active"), ("WAITING_FOR_SCORE", "Waiting for score"), ("COMPLETED", "Completed"), ("DRAW", "Draw"), ("REJECTED", "Rejected"), ("CANCELED", "Canceled"), ("EXPIRED", "Expired")], default="REQUESTED", max_length=20, verbose_name="status")),
                ("category", models.CharField(choices=[("alternative", "Alternative"), ("growth", "Growth"), ("health", "Health"), ("challenge", "Challenge")], max_length=20, verbose_name="category")),
                ("score_key", models.CharField(max_length=50, verbose_name="score key")),
                ("target_year", models.IntegerField(verbose_name="target year")),
                ("target_month", models.IntegerField(verbose_name="target month")),
                ("requested_at", models.DateTimeField(verbose_name="requested at")),
                ("request_deadline_at", models.DateTimeField(verbose_name="request deadline at")),
                ("pair_key", models.CharField(max_length=64, verbose_name="pair key")),
                ("accepted_at", models.DateTimeField(blank=True, null=True, verbose_name="accepted at")),
                ("started_at", models.DateTimeField(blank=True, null=True, verbose_name="started at")),
                ("score_expected_at", models.DateTimeField(blank=True, null=True, verbose_name="score expected at")),
                ("completed_at", models.DateTimeField(blank=True, null=True, verbose_name="completed at")),
                ("closed_at", models.DateTimeField(blank=True, null=True, verbose_name="closed at")),
                ("result_locked_at", models.DateTimeField(blank=True, null=True, verbose_name="result locked at")),
                ("is_draw", models.BooleanField(default=False, verbose_name="is draw")),
                ("last_settlement_error", models.TextField(blank=True, default="", verbose_name="last settlement error")),
                ("state_version", models.PositiveIntegerField(default=0, verbose_name="state version")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("opponent", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="opponent_yuntaek_battles", to=settings.AUTH_USER_MODEL, verbose_name="opponent")),
                ("requester", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="requested_yuntaek_battles", to=settings.AUTH_USER_MODEL, verbose_name="requester")),
                ("winner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="won_yuntaek_battles", to=settings.AUTH_USER_MODEL, verbose_name="winner")),
            ],
            options={
                "verbose_name": "yuntaek battle",
                "verbose_name_plural": "yuntaek battles",
            },
        ),
        migrations.CreateModel(
            name="BattleProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("battle_code", models.CharField(max_length=32, unique=True, verbose_name="battle code")),
                ("is_enabled", models.BooleanField(default=True, verbose_name="is enabled")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="updated at")),
                ("active_battle", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="active_profiles", to="battles.yuntaekbattle", verbose_name="active battle")),
                ("pending_result_battle", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pending_result_profiles", to="battles.yuntaekbattle", verbose_name="pending result battle")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="battle_profile", to=settings.AUTH_USER_MODEL, verbose_name="user")),
            ],
            options={
                "verbose_name": "battle profile",
                "verbose_name_plural": "battle profiles",
            },
        ),
        migrations.CreateModel(
            name="BattleParticipant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("requester", "Requester"), ("opponent", "Opponent")], max_length=20, verbose_name="role")),
                ("mission_won_count", models.PositiveIntegerField(default=0, verbose_name="mission won count")),
                ("mission_bonus_score", models.IntegerField(default=0, verbose_name="mission bonus score")),
                ("official_base_score", models.IntegerField(blank=True, null=True, verbose_name="official base score")),
                ("final_score", models.IntegerField(blank=True, null=True, verbose_name="final score")),
                ("official_score_snapshot", models.JSONField(blank=True, default=dict, verbose_name="official score snapshot")),
                ("profile_snapshot", models.JSONField(blank=True, default=dict, verbose_name="profile snapshot")),
                ("result_seen_at", models.DateTimeField(blank=True, null=True, verbose_name="result seen at")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("battle", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="participants", to="battles.yuntaekbattle", verbose_name="battle")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="battle_participations", to=settings.AUTH_USER_MODEL, verbose_name="user")),
            ],
            options={
                "verbose_name": "battle participant",
                "verbose_name_plural": "battle participants",
            },
        ),
        migrations.CreateModel(
            name="BattleReward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("points", models.IntegerField(verbose_name="points")),
                ("reason", models.CharField(choices=[("BATTLE_WIN", "Battle win"), ("BATTLE_DRAW", "Battle draw"), ("BATTLE_DELAY_COMPENSATION", "Battle delay compensation")], max_length=40, verbose_name="reason")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("battle", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rewards", to="battles.yuntaekbattle", verbose_name="battle")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="battle_rewards", to=settings.AUTH_USER_MODEL, verbose_name="user")),
            ],
            options={
                "verbose_name": "battle reward",
                "verbose_name_plural": "battle rewards",
            },
        ),
        migrations.CreateModel(
            name="BattleMission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title_snapshot", models.CharField(max_length=200, verbose_name="title snapshot")),
                ("description_snapshot", models.TextField(verbose_name="description snapshot")),
                ("verification_snapshot", models.JSONField(blank=True, default=dict, verbose_name="verification snapshot")),
                ("status", models.CharField(choices=[("OPEN", "Open"), ("WON", "Won"), ("DRAW", "Draw"), ("EXPIRED", "Expired")], default="OPEN", max_length=20, verbose_name="status")),
                ("won_at", models.DateTimeField(blank=True, null=True, verbose_name="won at")),
                ("win_evidence_snapshot", models.JSONField(blank=True, null=True, verbose_name="win evidence snapshot")),
                ("point_value", models.PositiveIntegerField(default=3, verbose_name="point value")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="created at")),
                ("battle", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="missions", to="battles.yuntaekbattle", verbose_name="battle")),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="battle_missions", to="battles.battlemissiontemplate", verbose_name="mission template")),
                ("winner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="won_battle_missions", to=settings.AUTH_USER_MODEL, verbose_name="winner")),
            ],
            options={
                "verbose_name": "battle mission",
                "verbose_name_plural": "battle missions",
                "ordering": ["battle_id", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="battleprofile",
            index=models.Index(fields=["battle_code"], name="battles_bat_battle__d4548e_idx"),
        ),
        migrations.AddIndex(
            model_name="battleparticipant",
            index=models.Index(fields=["user", "result_seen_at"], name="battles_bat_user_id_6de599_idx"),
        ),
        migrations.AddIndex(
            model_name="battlereward",
            index=models.Index(fields=["user", "reason"], name="battles_bat_user_id_3d2060_idx"),
        ),
        migrations.AddIndex(
            model_name="yuntaekbattle",
            index=models.Index(fields=["pair_key"], name="battles_yun_pair_ke_67d3b9_idx"),
        ),
        migrations.AddIndex(
            model_name="yuntaekbattle",
            index=models.Index(fields=["status"], name="battles_yun_status_9f599d_idx"),
        ),
        migrations.AddIndex(
            model_name="yuntaekbattle",
            index=models.Index(fields=["target_year", "target_month"], name="battles_yun_target__996848_idx"),
        ),
        migrations.AddIndex(
            model_name="yuntaekbattle",
            index=models.Index(fields=["requester", "status"], name="battles_yun_request_747db7_idx"),
        ),
        migrations.AddIndex(
            model_name="yuntaekbattle",
            index=models.Index(fields=["opponent", "status"], name="battles_yun_opponen_06e4b7_idx"),
        ),
        migrations.AddConstraint(
            model_name="battlemissiontemplate",
            constraint=models.UniqueConstraint(fields=("category", "display_order"), name="battles_unique_mission_template_order_per_category"),
        ),
        migrations.AddConstraint(
            model_name="yuntaekbattle",
            constraint=models.CheckConstraint(condition=~Q(requester=F("opponent")), name="battles_no_self_battle"),
        ),
        migrations.AddConstraint(
            model_name="yuntaekbattle",
            constraint=models.UniqueConstraint(condition=Q(status__in=["REQUESTED", "ACTIVE", "WAITING_FOR_SCORE"]), fields=("pair_key",), name="battles_unique_open_pair_key"),
        ),
        migrations.AddConstraint(
            model_name="battleparticipant",
            constraint=models.UniqueConstraint(fields=("battle", "user"), name="battles_unique_participant_per_battle"),
        ),
        migrations.AddConstraint(
            model_name="battlereward",
            constraint=models.UniqueConstraint(fields=("battle", "user", "reason"), name="battles_unique_reward_per_reason"),
        ),
        migrations.AddConstraint(
            model_name="battlemission",
            constraint=models.UniqueConstraint(fields=("battle", "template"), name="battles_unique_template_per_battle"),
        ),
    ]
