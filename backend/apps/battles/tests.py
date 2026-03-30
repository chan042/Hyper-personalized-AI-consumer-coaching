from datetime import date, datetime, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.battles.models import (
    BattleMission,
    BattleMissionTemplate,
    BattleParticipant,
    BattleProfile,
    BattleReward,
    YuntaekBattle,
)
from apps.battles.services import (
    evaluate_active_battle_missions_for_user,
    finalize_single_battle,
    get_battle_entry,
    get_current_battle_progress,
    get_battle_result,
    settle_battle_category_zero_spend,
)
from apps.battles.views import BattleProfileMeView
from apps.challenges.models import ChallengeTemplate, UserChallenge
from apps.notifications.models import Notification
from apps.transactions.models import Transaction


class BattleMissionNotificationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="requester@example.com",
            username="requester",
            password="test-password",
            character_name="요청자",
        )
        self.opponent = user_model.objects.create_user(
            email="opponent@example.com",
            username="opponent",
            password="test-password",
            character_name="상대방",
        )

    def _make_aware(self, year, month, day, hour=9, minute=0):
        return timezone.make_aware(datetime(year, month, day, hour, minute))

    def _create_active_battle(self, *, category, started_at, score_key="growth_consumption"):
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.ACTIVE,
            category=category,
            score_key=score_key,
            target_year=started_at.year,
            target_month=started_at.month,
            requested_at=started_at - timedelta(hours=1),
            request_deadline_at=started_at,
            accepted_at=started_at,
            started_at=started_at,
            score_expected_at=started_at + timedelta(days=30),
            pair_key=f"{self.requester.id}:{self.opponent.id}:{category}:{started_at:%Y%m%d%H%M}",
            state_version=1,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
        )
        return battle

    def _create_mission(self, battle, *, title, verification_type, verification_config, display_order=1):
        template = BattleMissionTemplate.objects.create(
            category=battle.category,
            title=title,
            description=f"{title} 설명",
            verification_type=verification_type,
            verification_config=verification_config,
            display_order=display_order,
            is_active=True,
        )
        return BattleMission.objects.create(
            battle=battle,
            template=template,
            title_snapshot=template.title,
            description_snapshot=template.description,
            verification_snapshot=verification_config,
            point_value=3,
        )

    def test_transaction_mission_win_sends_notifications_to_both_users(self):
        now = timezone.now()
        battle = self._create_active_battle(
            category=YuntaekBattle.Category.GROWTH,
            started_at=now - timedelta(days=1),
        )
        mission = self._create_mission(
            battle,
            title="교육/학습 거래 1건 먼저 등록",
            verification_type="transaction_category_count",
            verification_config={"category": "교육/학습", "required_count": 1},
        )
        transaction_obj = Transaction.objects.create(
            user=self.requester,
            category="교육/학습",
            item="온라인 강의",
            amount=15000,
            date=now,
        )

        with self.captureOnCommitCallbacks(execute=True):
            settled_count = evaluate_active_battle_missions_for_user(
                self.requester.id,
                trigger_transaction_id=transaction_obj.id,
                observed_at=now,
            )

        self.assertEqual(settled_count, 1)
        mission.refresh_from_db()
        self.assertEqual(mission.status, BattleMission.Status.WON)
        self.assertEqual(mission.winner_id, self.requester.id)

        winner_notification = Notification.objects.get(
            user=self.requester,
            event_code=Notification.BattleEventCode.MISSION_WON,
        )
        opponent_notification = Notification.objects.get(
            user=self.opponent,
            event_code=Notification.BattleEventCode.OPPONENT_MISSION_WON,
        )
        self.assertIn(mission.title_snapshot, winner_notification.message)
        self.assertIn("요청자", opponent_notification.title)
        self.assertEqual(winner_notification.get_redirect_url(), "/challenge-battle/progress")
        self.assertEqual(opponent_notification.get_redirect_url(), "/challenge-battle/progress")

    def test_zero_spend_mission_win_sends_notifications_to_both_users(self):
        started_at = self._make_aware(2026, 3, 10)
        battle = self._create_active_battle(
            category=YuntaekBattle.Category.HEALTH,
            started_at=started_at,
            score_key="health_score",
        )
        mission = self._create_mission(
            battle,
            title="카페/간식 카테고리 3일 연속 무지출 먼저 달성",
            verification_type="category_zero_spend_streak",
            verification_config={"category": "카페/간식", "required_days": 3},
        )
        Transaction.objects.create(
            user=self.opponent,
            category="카페/간식",
            item="커피",
            amount=4900,
            date=self._make_aware(2026, 3, 11, 12),
        )

        with self.captureOnCommitCallbacks(execute=True):
            result = settle_battle_category_zero_spend(reference_date=date(2026, 3, 13))

        self.assertEqual(result["settled_count"], 1)
        mission.refresh_from_db()
        self.assertEqual(mission.status, BattleMission.Status.WON)
        self.assertEqual(mission.winner_id, self.requester.id)
        self.assertTrue(
            Notification.objects.filter(
                user=self.requester,
                event_code=Notification.BattleEventCode.MISSION_WON,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.opponent,
                event_code=Notification.BattleEventCode.OPPONENT_MISSION_WON,
            ).exists()
        )

    def test_zero_spend_reset_notification_is_sent_once_per_day(self):
        started_at = self._make_aware(2026, 3, 10)
        battle = self._create_active_battle(
            category=YuntaekBattle.Category.HEALTH,
            started_at=started_at,
            score_key="health_score",
        )
        mission = self._create_mission(
            battle,
            title="카페/간식 카테고리 3일 연속 무지출 먼저 달성",
            verification_type="category_zero_spend_streak",
            verification_config={"category": "카페/간식", "required_days": 3},
        )
        Transaction.objects.create(
            user=self.requester,
            category="카페/간식",
            item="커피",
            amount=5200,
            date=self._make_aware(2026, 3, 13, 8),
        )
        Transaction.objects.create(
            user=self.opponent,
            category="카페/간식",
            item="커피",
            amount=4300,
            date=self._make_aware(2026, 3, 11, 9),
        )

        result = settle_battle_category_zero_spend(reference_date=date(2026, 3, 13))
        self.assertEqual(result["settled_count"], 0)

        reset_notification = Notification.objects.get(
            user=self.requester,
            event_code=Notification.BattleEventCode.STREAK_RESET,
        )
        self.assertIn("2일 연속 기록", reset_notification.message)
        self.assertEqual(reset_notification.get_redirect_url(), "/challenge-battle/progress")

        settle_battle_category_zero_spend(reference_date=date(2026, 3, 13))
        self.assertEqual(
            Notification.objects.filter(
                user=self.requester,
                event_code=Notification.BattleEventCode.STREAK_RESET,
            ).count(),
            1,
        )
        mission.refresh_from_db()
        self.assertEqual(mission.status, BattleMission.Status.OPEN)


class BattleRewardPayoutTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="winner@example.com",
            username="winner",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="opponent@example.com",
            username="opponent",
            password="test-password",
        )

    def _create_waiting_battle(
        self,
        *,
        requester_bonus=0,
        opponent_bonus=0,
        last_settlement_error="",
    ):
        now = timezone.now()
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.WAITING_FOR_SCORE,
            category=YuntaekBattle.Category.GROWTH,
            score_key="growth_consumption",
            target_year=now.year,
            target_month=now.month,
            requested_at=now - timedelta(days=2),
            request_deadline_at=now - timedelta(days=2) + timedelta(hours=12),
            accepted_at=now - timedelta(days=2) + timedelta(hours=1),
            started_at=now - timedelta(days=2) + timedelta(hours=1),
            score_expected_at=now - timedelta(minutes=10),
            pair_key=f"{self.requester.id}:{self.opponent.id}:reward:{now:%Y%m%d%H%M%S%f}",
            state_version=2,
            last_settlement_error=last_settlement_error,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            mission_won_count=requester_bonus // 3,
            mission_bonus_score=requester_bonus,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            mission_won_count=opponent_bonus // 3,
            mission_bonus_score=opponent_bonus,
            profile_snapshot={},
        )
        return battle

    def test_finalize_single_battle_credits_winner_points_once(self):
        battle = self._create_waiting_battle(requester_bonus=3, opponent_bonus=0)

        finalize_single_battle(battle.id)
        self.requester.refresh_from_db()
        self.opponent.refresh_from_db()

        self.assertEqual(self.requester.points, 500)
        self.assertEqual(self.requester.total_points_earned, 500)
        self.assertEqual(self.opponent.points, 0)
        self.assertEqual(self.opponent.total_points_earned, 0)
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                user=self.requester,
                reason=BattleReward.Reason.BATTLE_WIN,
                points=500,
            ).count(),
            1,
        )

        result = finalize_single_battle(battle.id)
        self.requester.refresh_from_db()
        self.opponent.refresh_from_db()

        self.assertEqual(result["result"], "already_finalized")
        self.assertEqual(self.requester.points, 500)
        self.assertEqual(self.requester.total_points_earned, 500)
        self.assertEqual(self.opponent.points, 0)
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                user=self.requester,
                reason=BattleReward.Reason.BATTLE_WIN,
            ).count(),
            1,
        )

    def test_finalize_single_battle_credits_draw_and_delay_compensation_once(self):
        battle = self._create_waiting_battle(
            requester_bonus=0,
            opponent_bonus=0,
            last_settlement_error="AI score delay",
        )

        finalize_single_battle(battle.id)
        self.requester.refresh_from_db()
        self.opponent.refresh_from_db()

        self.assertEqual(self.requester.points, 700)
        self.assertEqual(self.requester.total_points_earned, 700)
        self.assertEqual(self.opponent.points, 700)
        self.assertEqual(self.opponent.total_points_earned, 700)
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                reason=BattleReward.Reason.BATTLE_DRAW,
            ).count(),
            2,
        )
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                reason=BattleReward.Reason.BATTLE_DELAY_COMPENSATION,
            ).count(),
            2,
        )

        result = finalize_single_battle(battle.id)
        self.requester.refresh_from_db()
        self.opponent.refresh_from_db()

        self.assertEqual(result["result"], "already_finalized")
        self.assertEqual(self.requester.points, 700)
        self.assertEqual(self.opponent.points, 700)
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                user=self.requester,
            ).count(),
            2,
        )
        self.assertEqual(
            BattleReward.objects.filter(
                battle=battle,
                user=self.opponent,
            ).count(),
            2,
        )


class BattleTransactionMissionWindowTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="requester-window@example.com",
            username="requester-window",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="opponent-window@example.com",
            username="opponent-window",
            password="test-password",
        )

    def _create_active_battle(self, *, category, started_at, score_key="growth_consumption"):
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.ACTIVE,
            category=category,
            score_key=score_key,
            target_year=started_at.year,
            target_month=started_at.month,
            requested_at=started_at - timedelta(hours=1),
            request_deadline_at=started_at,
            accepted_at=started_at,
            started_at=started_at,
            score_expected_at=started_at + timedelta(days=30),
            pair_key=f"{self.requester.id}:{self.opponent.id}:window:{started_at:%Y%m%d%H%M%S%f}",
            state_version=1,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
        )
        return battle

    def _create_mission(self, battle, *, title, verification_type, verification_config, display_order=1):
        template = BattleMissionTemplate.objects.create(
            category=battle.category,
            title=title,
            description=f"{title} 설명",
            verification_type=verification_type,
            verification_config=verification_config,
            display_order=display_order,
            is_active=True,
        )
        return BattleMission.objects.create(
            battle=battle,
            template=template,
            title_snapshot=template.title,
            description_snapshot=template.description,
            verification_snapshot=verification_config,
            point_value=3,
        )

    def test_pre_battle_transaction_update_does_not_settle_mission(self):
        started_at = timezone.now()
        battle = self._create_active_battle(
            category=YuntaekBattle.Category.GROWTH,
            started_at=started_at,
        )
        mission = self._create_mission(
            battle,
            title="교육/학습 거래 1건 먼저 등록",
            verification_type="transaction_category_count",
            verification_config={"category": "교육/학습", "required_count": 1},
        )
        transaction_obj = Transaction.objects.create(
            user=self.requester,
            category="교육/학습",
            item="온라인 강의",
            amount=15000,
            date=started_at,
        )
        Transaction.objects.filter(pk=transaction_obj.pk).update(created_at=started_at - timedelta(days=1))
        transaction_obj.refresh_from_db()

        settled_count = evaluate_active_battle_missions_for_user(
            self.requester.id,
            trigger_transaction_id=transaction_obj.id,
            observed_at=timezone.now(),
        )

        mission.refresh_from_db()
        participant = BattleParticipant.objects.get(battle=battle, user=self.requester)
        self.assertEqual(settled_count, 0)
        self.assertEqual(mission.status, BattleMission.Status.OPEN)
        self.assertEqual(participant.mission_won_count, 0)
        self.assertEqual(participant.mission_bonus_score, 0)

    def test_won_transaction_mission_stays_won_after_transaction_delete(self):
        started_at = timezone.now() - timedelta(days=1)
        battle = self._create_active_battle(
            category=YuntaekBattle.Category.GROWTH,
            started_at=started_at,
        )
        mission = self._create_mission(
            battle,
            title="교육/학습 거래 1건 먼저 등록",
            verification_type="transaction_category_count",
            verification_config={"category": "교육/학습", "required_count": 1},
        )
        transaction_obj = Transaction.objects.create(
            user=self.requester,
            category="교육/학습",
            item="온라인 강의",
            amount=15000,
            date=timezone.now(),
        )

        first_settlement_count = evaluate_active_battle_missions_for_user(
            self.requester.id,
            trigger_transaction_id=transaction_obj.id,
            observed_at=timezone.now(),
        )
        transaction_obj.delete()
        second_settlement_count = evaluate_active_battle_missions_for_user(
            self.requester.id,
            observed_at=timezone.now(),
        )

        mission.refresh_from_db()
        participant = BattleParticipant.objects.get(battle=battle, user=self.requester)
        self.assertEqual(first_settlement_count, 1)
        self.assertEqual(second_settlement_count, 0)
        self.assertEqual(mission.status, BattleMission.Status.WON)
        self.assertEqual(mission.winner_id, self.requester.id)
        self.assertEqual(participant.mission_won_count, 1)
        self.assertEqual(participant.mission_bonus_score, 3)


class BattleResultReadOnlyTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="result-requester@example.com",
            username="result-requester",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="result-opponent@example.com",
            username="result-opponent",
            password="test-password",
        )

    def _create_waiting_battle(self):
        now = timezone.now()
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.WAITING_FOR_SCORE,
            category=YuntaekBattle.Category.GROWTH,
            score_key="growth_consumption",
            target_year=now.year,
            target_month=now.month,
            requested_at=now - timedelta(days=2),
            request_deadline_at=now - timedelta(days=2) + timedelta(hours=12),
            accepted_at=now - timedelta(days=2) + timedelta(hours=1),
            started_at=now - timedelta(days=2) + timedelta(hours=1),
            score_expected_at=now - timedelta(minutes=10),
            pair_key=f"{self.requester.id}:{self.opponent.id}:result:{now:%Y%m%d%H%M%S%f}",
            state_version=2,
            last_settlement_error="윤택지수 계산 대기 중",
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
        )
        return battle

    def test_waiting_result_does_not_trigger_finalization(self):
        battle = self._create_waiting_battle()

        with patch("apps.battles.services.result_service.finalize_single_battle") as mocked_finalize:
            payload = get_battle_result(self.requester, battle.id)

        battle.refresh_from_db()
        self.assertFalse(mocked_finalize.called)
        self.assertEqual(payload["battle_id"], battle.id)
        self.assertFalse(payload["result_ready"])
        self.assertEqual(payload["status"], YuntaekBattle.Status.WAITING_FOR_SCORE)
        self.assertEqual(payload["delay_message"], "윤택지수 계산 대기 중")
        self.assertEqual(battle.status, YuntaekBattle.Status.WAITING_FOR_SCORE)
        self.assertEqual(BattleReward.objects.filter(battle=battle).count(), 0)

    def test_waiting_result_keeps_profile_and_participant_state_unchanged(self):
        battle = self._create_waiting_battle()
        BattleProfile.objects.create(
            user=self.requester,
            battle_code="REQREAD01",
            active_battle=battle,
            pending_result_battle=None,
        )
        BattleProfile.objects.create(
            user=self.opponent,
            battle_code="OPPREAD01",
            active_battle=battle,
            pending_result_battle=None,
        )

        payload = get_battle_result(self.requester, battle.id)

        requester_profile = BattleProfile.objects.get(user=self.requester)
        opponent_profile = BattleProfile.objects.get(user=self.opponent)
        participants = BattleParticipant.objects.filter(battle=battle).order_by("user_id")
        self.assertFalse(payload["result_ready"])
        self.assertEqual(requester_profile.active_battle_id, battle.id)
        self.assertIsNone(requester_profile.pending_result_battle_id)
        self.assertEqual(opponent_profile.active_battle_id, battle.id)
        self.assertIsNone(opponent_profile.pending_result_battle_id)
        self.assertTrue(all(participant.result_seen_at is None for participant in participants))


class BattleChallengeMissionTemplateCodeTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="challenge-requester@example.com",
            username="challenge-requester",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="challenge-opponent@example.com",
            username="challenge-opponent",
            password="test-password",
        )

    def _create_active_battle(self, *, started_at):
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.ACTIVE,
            category=YuntaekBattle.Category.CHALLENGE,
            score_key="challenge_success",
            target_year=started_at.year,
            target_month=started_at.month,
            requested_at=started_at - timedelta(hours=1),
            request_deadline_at=started_at,
            accepted_at=started_at,
            started_at=started_at,
            score_expected_at=started_at + timedelta(days=30),
            pair_key=f"{self.requester.id}:{self.opponent.id}:challenge:{started_at:%Y%m%d%H%M%S}",
            state_version=1,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
        )
        return battle

    def _create_challenge_template(self, *, name, code):
        return ChallengeTemplate.objects.create(
            name=name,
            code=code,
            description=f"{name} 설명",
            success_conditions={"type": "zero_spend"},
            display_config={},
            is_active=True,
            display_order=1,
        )

    def _create_mission(self, battle, verification_config):
        template = BattleMissionTemplate.objects.create(
            category=battle.category,
            title="챌린지 완료",
            description="챌린지 완료 설명",
            verification_type="challenge_template_complete",
            verification_config=verification_config,
            display_order=1,
            is_active=True,
        )
        return BattleMission.objects.create(
            battle=battle,
            template=template,
            title_snapshot=template.title,
            description_snapshot=template.description,
            verification_snapshot=dict(verification_config),
            point_value=3,
        )

    def _create_completed_user_challenge(self, *, template, completed_at):
        return UserChallenge.objects.create(
            user=self.requester,
            source_type="duduk",
            template=template,
            name=template.name,
            description=template.description,
            duration_days=template.duration_days,
            success_conditions=template.success_conditions,
            success_description=template.success_description,
            display_config=template.display_config,
            status="completed",
            started_at=completed_at - timedelta(days=1),
            completed_at=completed_at,
        )

    def test_challenge_mission_uses_template_code_when_template_id_is_stale(self):
        started_at = timezone.now() - timedelta(days=3)
        battle = self._create_active_battle(started_at=started_at)
        stale_template = self._create_challenge_template(
            name="3일 연속 무지출 챌린지",
            code="three_day_zero_spend",
        )
        current_template = self._create_challenge_template(
            name="3일 연속 무지출 챌린지 v2",
            code="three_day_zero_spend",
        )
        mission = self._create_mission(
            battle,
            {
                "template_name": "3일 연속 무지출 챌린지",
                "template_code": "three_day_zero_spend",
                "template_id": stale_template.id,
            },
        )
        completed_at = started_at + timedelta(hours=6)
        completed_challenge = self._create_completed_user_challenge(
            template=current_template,
            completed_at=completed_at,
        )

        with self.captureOnCommitCallbacks(execute=True):
            settled_count = evaluate_active_battle_missions_for_user(
                self.requester.id,
                observed_at=completed_at,
            )

        mission.refresh_from_db()
        self.assertEqual(settled_count, 1)
        self.assertEqual(mission.status, BattleMission.Status.WON)
        self.assertEqual(mission.winner_id, self.requester.id)
        self.assertEqual(mission.win_evidence_snapshot["template_code"], "three_day_zero_spend")
        self.assertEqual(mission.win_evidence_snapshot["matched_template_id"], current_template.id)
        self.assertEqual(mission.win_evidence_snapshot["user_challenge_id"], completed_challenge.id)

    def test_challenge_mission_falls_back_to_template_name_for_legacy_snapshot(self):
        started_at = timezone.now() - timedelta(days=3)
        battle = self._create_active_battle(started_at=started_at)
        template = self._create_challenge_template(
            name="무00의 날",
            code=None,
        )
        mission = self._create_mission(
            battle,
            {
                "template_name": "무00의 날",
                "template_id": 999999,
            },
        )
        completed_at = started_at + timedelta(hours=8)
        self._create_completed_user_challenge(
            template=template,
            completed_at=completed_at,
        )

        with self.captureOnCommitCallbacks(execute=True):
            settled_count = evaluate_active_battle_missions_for_user(
                self.requester.id,
                observed_at=completed_at,
            )

        mission.refresh_from_db()
        self.assertEqual(settled_count, 1)
        self.assertEqual(mission.status, BattleMission.Status.WON)
        self.assertEqual(mission.win_evidence_snapshot["template_name"], "무00의 날")


class BattleProfileReconciliationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="profile-requester@example.com",
            username="profile-requester",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="profile-opponent@example.com",
            username="profile-opponent",
            password="test-password",
        )
        self.factory = APIRequestFactory()

    def _create_battle(self, *, status, started_at=None, completed_at=None):
        now = timezone.now()
        started_at = started_at or now - timedelta(days=2)
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=status,
            category=YuntaekBattle.Category.GROWTH,
            score_key="growth_consumption",
            target_year=started_at.year,
            target_month=started_at.month,
            requested_at=started_at - timedelta(hours=1),
            request_deadline_at=started_at,
            accepted_at=started_at if status != YuntaekBattle.Status.REQUESTED else None,
            started_at=started_at if status != YuntaekBattle.Status.REQUESTED else None,
            score_expected_at=started_at + timedelta(days=30),
            completed_at=completed_at,
            closed_at=completed_at,
            result_locked_at=completed_at,
            winner=self.requester if status == YuntaekBattle.Status.COMPLETED else None,
            is_draw=(status == YuntaekBattle.Status.DRAW),
            pair_key=f"{self.requester.id}:{self.opponent.id}:profile:{status}:{started_at:%Y%m%d%H%M%S%f}",
            state_version=1,
        )
        return battle

    def _create_participants(self, battle, *, requester_seen_at=None, opponent_seen_at=None):
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
            result_seen_at=requester_seen_at,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
            result_seen_at=opponent_seen_at,
        )

    def test_get_battle_entry_reconciles_missing_active_battle_pointer(self):
        battle = self._create_battle(status=YuntaekBattle.Status.ACTIVE)
        BattleProfile.objects.create(
            user=self.requester,
            battle_code="REQSYNC01",
            active_battle=None,
            pending_result_battle=None,
        )

        payload = get_battle_entry(self.requester)

        profile = BattleProfile.objects.get(user=self.requester)
        self.assertEqual(payload["next_screen"], "progress")
        self.assertEqual(payload["battle_id"], battle.id)
        self.assertEqual(profile.active_battle_id, battle.id)
        self.assertIsNone(profile.pending_result_battle_id)

    def test_profile_me_view_reconciles_missing_pending_result_pointer(self):
        completed_at = timezone.now() - timedelta(hours=1)
        battle = self._create_battle(
            status=YuntaekBattle.Status.COMPLETED,
            started_at=completed_at - timedelta(days=3),
            completed_at=completed_at,
        )
        self._create_participants(battle)
        BattleProfile.objects.create(
            user=self.requester,
            battle_code="REQSYNC02",
            active_battle=None,
            pending_result_battle=None,
        )

        request = self.factory.get("/api/battles/profile/me/")
        force_authenticate(request, user=self.requester)
        response = BattleProfileMeView.as_view()(request)

        profile = BattleProfile.objects.get(user=self.requester)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["active_battle"])
        self.assertEqual(response.data["pending_result_battle"]["id"], battle.id)
        self.assertIsNone(profile.active_battle_id)
        self.assertEqual(profile.pending_result_battle_id, battle.id)


class BattleProgressDDayTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.requester = user_model.objects.create_user(
            email="dday-requester@example.com",
            username="dday-requester",
            password="test-password",
        )
        self.opponent = user_model.objects.create_user(
            email="dday-opponent@example.com",
            username="dday-opponent",
            password="test-password",
        )

    def _make_aware(self, year, month, day, hour=9, minute=0):
        return timezone.make_aware(datetime(year, month, day, hour, minute))

    def _create_active_battle(self):
        started_at = self._make_aware(2026, 3, 10, 9, 0)
        battle = YuntaekBattle.objects.create(
            requester=self.requester,
            opponent=self.opponent,
            status=YuntaekBattle.Status.ACTIVE,
            category=YuntaekBattle.Category.GROWTH,
            score_key="growth_consumption",
            target_year=2026,
            target_month=3,
            requested_at=started_at - timedelta(hours=1),
            request_deadline_at=started_at,
            accepted_at=started_at,
            started_at=started_at,
            score_expected_at=self._make_aware(2026, 4, 1, 0, 0),
            pair_key=f"{self.requester.id}:{self.opponent.id}:dday:{started_at:%Y%m%d%H%M%S}",
            state_version=1,
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.requester,
            role=BattleParticipant.Role.REQUESTER,
            profile_snapshot={},
        )
        BattleParticipant.objects.create(
            battle=battle,
            user=self.opponent,
            role=BattleParticipant.Role.OPPONENT,
            profile_snapshot={},
        )
        return battle

    def test_progress_shows_d_minus_one_on_day_before_score_day(self):
        self._create_active_battle()

        with patch("apps.battles.services.progress_service.timezone.now", return_value=self._make_aware(2026, 3, 31, 9, 0)):
            payload = get_current_battle_progress(self.requester)

        self.assertEqual(payload["d_day"], 1)

    def test_progress_counts_score_day_until_result_day(self):
        self._create_active_battle()

        with patch("apps.battles.services.progress_service.timezone.now", return_value=self._make_aware(2026, 3, 30, 9, 0)):
            payload = get_current_battle_progress(self.requester)

        self.assertEqual(payload["d_day"], 2)
