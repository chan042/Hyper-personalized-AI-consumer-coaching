from django.conf import settings
from django.db import models
from django.db.models import F, Q


class BattleProfile(models.Model):
    # Entry routing uses these pointers for "current battle" and "unseen result" flows.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="battle_profile",
        verbose_name="user",
    )
    battle_code = models.CharField(max_length=32, unique=True, verbose_name="battle code")
    active_battle = models.ForeignKey(
        "YuntaekBattle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_profiles",
        verbose_name="active battle",
    )
    pending_result_battle = models.ForeignKey(
        "YuntaekBattle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_result_profiles",
        verbose_name="pending result battle",
    )
    is_enabled = models.BooleanField(default=True, verbose_name="is enabled")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated at")

    class Meta:
        verbose_name = "battle profile"
        verbose_name_plural = "battle profiles"
        indexes = [
            models.Index(fields=["battle_code"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.battle_code}"


class YuntaekBattle(models.Model):
    class Status(models.TextChoices):
        # REQUESTED: 신청 후 수락 대기
        # ACTIVE: 대결 진행 중
        # WAITING_FOR_SCORE: 월말 점수 계산 대기
        # COMPLETED / DRAW: 결과 확정
        REQUESTED = "REQUESTED", "Requested"
        ACTIVE = "ACTIVE", "Active"
        WAITING_FOR_SCORE = "WAITING_FOR_SCORE", "Waiting for score"
        COMPLETED = "COMPLETED", "Completed"
        DRAW = "DRAW", "Draw"
        REJECTED = "REJECTED", "Rejected"
        CANCELED = "CANCELED", "Canceled"
        EXPIRED = "EXPIRED", "Expired"

    class Category(models.TextChoices):
        # alternative: 대안 행동 실현도
        # growth: 성장
        # health: 건강 점수
        # challenge: 챌린지
        ALTERNATIVE = "alternative", "Alternative"
        GROWTH = "growth", "Growth"
        HEALTH = "health", "Health"
        CHALLENGE = "challenge", "Challenge"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="requested_yuntaek_battles",
        verbose_name="requester",
    )
    opponent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="opponent_yuntaek_battles",
        verbose_name="opponent",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
        verbose_name="status",
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        verbose_name="category",
    )
    score_key = models.CharField(max_length=50, verbose_name="score key")
    target_year = models.IntegerField(verbose_name="target year")
    target_month = models.IntegerField(verbose_name="target month")
    requested_at = models.DateTimeField(verbose_name="requested at")
    request_deadline_at = models.DateTimeField(verbose_name="request deadline at")
    # pair_key is a normalized user-pair key used to prevent open duplicate battles.
    pair_key = models.CharField(max_length=64, verbose_name="pair key")
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="accepted at")
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="started at")
    score_expected_at = models.DateTimeField(null=True, blank=True, verbose_name="score expected at")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="completed at")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="closed at")
    result_locked_at = models.DateTimeField(null=True, blank=True, verbose_name="result locked at")
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_yuntaek_battles",
        verbose_name="winner",
    )
    is_draw = models.BooleanField(default=False, verbose_name="is draw")
    # state_version is incremented when battle state/progress changes for polling clients.
    last_settlement_error = models.TextField(blank=True, default="", verbose_name="last settlement error")
    state_version = models.PositiveIntegerField(default=0, verbose_name="state version")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated at")

    class Meta:
        verbose_name = "yuntaek battle"
        verbose_name_plural = "yuntaek battles"
        indexes = [
            models.Index(fields=["pair_key"]),
            models.Index(fields=["status"]),
            models.Index(fields=["target_year", "target_month"]),
            models.Index(fields=["requester", "status"]),
            models.Index(fields=["opponent", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(requester=F("opponent")),
                name="battles_no_self_battle",
            ),
            models.UniqueConstraint(
                fields=["pair_key"],
                condition=Q(
                    status__in=[
                        "REQUESTED",
                        "ACTIVE",
                        "WAITING_FOR_SCORE",
                    ]
                ),
                name="battles_unique_open_pair_key",
            ),
        ]

    def __str__(self):
        return f"{self.requester_id} vs {self.opponent_id} ({self.target_year}-{self.target_month:02d})"


class BattleParticipant(models.Model):
    class Role(models.TextChoices):
        # requester: 신청한 사람, opponent: 신청받은 사람
        REQUESTER = "requester", "Requester"
        OPPONENT = "opponent", "Opponent"

    battle = models.ForeignKey(
        YuntaekBattle,
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="battle",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="battle_participations",
        verbose_name="user",
    )
    role = models.CharField(max_length=20, choices=Role.choices, verbose_name="role")
    mission_won_count = models.PositiveIntegerField(default=0, verbose_name="mission won count")
    mission_bonus_score = models.IntegerField(default=0, verbose_name="mission bonus score")
    # official_base_score: 카테고리 공식 점수
    # final_score: 공식 점수 + 미션 보너스
    official_base_score = models.IntegerField(null=True, blank=True, verbose_name="official base score")
    final_score = models.IntegerField(null=True, blank=True, verbose_name="final score")
    # Snapshot is frozen at result finalization so later source-data edits do not rewrite history.
    official_score_snapshot = models.JSONField(default=dict, blank=True, verbose_name="official score snapshot")
    profile_snapshot = models.JSONField(default=dict, blank=True, verbose_name="profile snapshot")
    result_seen_at = models.DateTimeField(null=True, blank=True, verbose_name="result seen at")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")

    class Meta:
        verbose_name = "battle participant"
        verbose_name_plural = "battle participants"
        constraints = [
            models.UniqueConstraint(fields=["battle", "user"], name="battles_unique_participant_per_battle"),
        ]
        indexes = [
            models.Index(fields=["user", "result_seen_at"]),
        ]

    def __str__(self):
        return f"{self.battle_id}:{self.user_id}"


class BattleMissionTemplate(models.Model):
    # Fixed mission definitions per category. Actual battles copy these into BattleMission snapshots.
    category = models.CharField(
        max_length=20,
        choices=YuntaekBattle.Category.choices,
        verbose_name="category",
    )
    title = models.CharField(max_length=200, verbose_name="title")
    description = models.TextField(verbose_name="description")
    verification_type = models.CharField(max_length=50, verbose_name="verification type")
    verification_config = models.JSONField(default=dict, blank=True, verbose_name="verification config")
    display_order = models.PositiveSmallIntegerField(verbose_name="display order")
    is_active = models.BooleanField(default=True, verbose_name="is active")

    class Meta:
        verbose_name = "battle mission template"
        verbose_name_plural = "battle mission templates"
        ordering = ["category", "display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "display_order"],
                name="battles_unique_mission_template_order_per_category",
            ),
        ]

    def __str__(self):
        return f"{self.get_category_display()}-{self.display_order}:{self.title}"


class BattleMission(models.Model):
    class Status(models.TextChoices):
        # OPEN: 아직 선점 전
        # WON: 한 사용자가 먼저 달성
        # DRAW: 동시 달성 무승부
        # EXPIRED: 기간 종료
        OPEN = "OPEN", "Open"
        WON = "WON", "Won"
        DRAW = "DRAW", "Draw"
        EXPIRED = "EXPIRED", "Expired"

    battle = models.ForeignKey(
        YuntaekBattle,
        on_delete=models.CASCADE,
        related_name="missions",
        verbose_name="battle",
    )
    template = models.ForeignKey(
        BattleMissionTemplate,
        on_delete=models.CASCADE,
        related_name="battle_missions",
        verbose_name="mission template",
    )
    title_snapshot = models.CharField(max_length=200, verbose_name="title snapshot")
    description_snapshot = models.TextField(verbose_name="description snapshot")
    verification_snapshot = models.JSONField(default=dict, blank=True, verbose_name="verification snapshot")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        verbose_name="status",
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_battle_missions",
        verbose_name="winner",
    )
    won_at = models.DateTimeField(null=True, blank=True, verbose_name="won at")
    # win_evidence_snapshot stores the winning proof at the moment the mission is locked.
    win_evidence_snapshot = models.JSONField(null=True, blank=True, verbose_name="win evidence snapshot")
    # point_value is the mission bonus score awarded to the winner.
    point_value = models.PositiveIntegerField(default=3, verbose_name="point value")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")

    class Meta:
        verbose_name = "battle mission"
        verbose_name_plural = "battle missions"
        ordering = ["battle_id", "id"]
        constraints = [
            models.UniqueConstraint(fields=["battle", "template"], name="battles_unique_template_per_battle"),
        ]

    def __str__(self):
        return f"{self.battle_id}:{self.title_snapshot}"


class BattleReward(models.Model):
    class Reason(models.TextChoices):
        # BATTLE_DRAW gives both users 500P according to current policy.
        BATTLE_WIN = "BATTLE_WIN", "Battle win"
        BATTLE_DRAW = "BATTLE_DRAW", "Battle draw"
        BATTLE_DELAY_COMPENSATION = "BATTLE_DELAY_COMPENSATION", "Battle delay compensation"

    battle = models.ForeignKey(
        YuntaekBattle,
        on_delete=models.CASCADE,
        related_name="rewards",
        verbose_name="battle",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="battle_rewards",
        verbose_name="user",
    )
    points = models.IntegerField(verbose_name="points")
    reason = models.CharField(max_length=40, choices=Reason.choices, verbose_name="reason")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")

    class Meta:
        verbose_name = "battle reward"
        verbose_name_plural = "battle rewards"
        constraints = [
            models.UniqueConstraint(fields=["battle", "user", "reason"], name="battles_unique_reward_per_reason"),
        ]
        indexes = [
            models.Index(fields=["user", "reason"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.reason}:{self.points}"
