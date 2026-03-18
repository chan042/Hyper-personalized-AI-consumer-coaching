from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from apps.coaching.models import Coaching
from apps.transactions.models import Transaction
from external.ai.client import AIClient, CoachingAdviceResponse


class AIClientCoachingTests(SimpleTestCase):
    def _build_client(self):
        client = AIClient.__new__(AIClient)
        client.client = object()
        client.default_model = "gemini-test"
        client.model = "gemini-test"
        client.purpose = "coaching"
        return client

    def test_parse_omits_json_mime_type_when_using_web_search(self):
        ai_client = self._build_client()
        captured = {}

        def fake_generate_content_with_fallback(*, contents, config, model):
            captured["config"] = config
            return SimpleNamespace(
                parsed={
                    "subject": "행동 변화 제안",
                    "title": "커피줄임",
                    "coaching_content": "이번 주는 커피 횟수를 한 번만 줄여보세요.",
                    "analysis": "카페 지출이 반복되고 있어요.",
                    "estimated_savings": 4500,
                }
            )

        ai_client._generate_content_with_fallback = fake_generate_content_with_fallback

        result, _ = ai_client._parse(
            "test prompt",
            CoachingAdviceResponse,
            use_web_search=True,
        )

        config_dict = captured["config"].model_dump(exclude_none=True)

        self.assertEqual(result["subject"], "행동 변화 제안")
        self.assertIn("tools", config_dict)
        self.assertNotIn("response_mime_type", config_dict)

    def test_get_advice_falls_back_to_non_search_prompt(self):
        ai_client = self._build_client()
        calls = []
        parse_results = [
            (None, None),
            (
                {
                    "subject": "행동 변화 제안",
                    "title": "커피줄임",
                    "coaching_content": "이번 주는 테이크아웃을 한 번 줄여보세요.",
                    "analysis": "카페 소비가 잦아요.",
                    "estimated_savings": 4500,
                },
                None,
            ),
        ]

        def fake_parse(prompt, response_model, **kwargs):
            calls.append({"prompt": prompt, **kwargs})
            return parse_results.pop(0)

        ai_client._parse = fake_parse
        ai_client._extract_search_sources = lambda response: []

        result = ai_client.get_advice("- 2026-03-18 카페/간식 / 아이스라떼 (카페) / 4500원")

        self.assertEqual(result["sources"], [])
        self.assertEqual(len(calls), 2)
        self.assertTrue(calls[0]["use_web_search"])
        self.assertFalse(calls[1]["use_web_search"])
        self.assertIn("위치 기반 대안과 키워드 기반 대안은 선택하지 마세요.", calls[1]["prompt"])


class CoachingSignalTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="coach-user",
            email="coach@example.com",
            password="password123",
        )

    @patch("apps.coaching.signals.AIClient")
    def test_creates_coaching_after_third_transaction(self, mock_ai_client_class):
        mock_ai_client = mock_ai_client_class.return_value
        mock_ai_client.get_advice.return_value = {
            "subject": "행동 변화 제안",
            "title": "커피줄임",
            "coaching_content": "이번 주는 커피 횟수를 한 번만 줄여보세요.",
            "analysis": "카페 소비가 반복되고 있어요.",
            "estimated_savings": 4500,
            "sources": [],
        }

        for index in range(3):
            Transaction.objects.create(
                user=self.user,
                category="카페/간식",
                item=f"아메리카노 {index + 1}",
                store="테스트카페",
                amount=4500,
                date=timezone.now(),
            )

        coaching = Coaching.objects.get(user=self.user)

        self.assertEqual(Coaching.objects.filter(user=self.user).count(), 1)
        self.assertEqual(coaching.subject, "행동 변화 제안")
        self.assertEqual(coaching.title, "커피줄임")
        self.assertEqual(coaching.estimated_savings, 4500)
        mock_ai_client.get_advice.assert_called_once()
