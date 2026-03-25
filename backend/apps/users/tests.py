from django.test import SimpleTestCase

from external.ai.client import AIClient


class AIClientGrowthPromptTests(SimpleTestCase):
    def _build_client(self):
        client = AIClient.__new__(AIClient)
        client.client = object()
        client.default_model = "gemini-test"
        client.model = "gemini-test"
        client.purpose = "analysis"
        return client

    def test_growth_prompt_includes_self_development_field(self):
        ai_client = self._build_client()
        captured = {}

        ai_client._get_transactions_summary = (
            lambda user_id, year, month: "- 2026-03-10 | 교육/학습 | 온라인 강의 | 클래스 | 59000원"
        )

        def fake_parse(prompt, response_model, **kwargs):
            captured["prompt"] = prompt
            return ({"total_growth": 59000, "reason": "자기개발 관련 지출입니다."}, None)

        ai_client._parse = fake_parse

        result = ai_client.analyze_growth_spending(
            1,
            2026,
            3,
            self_development_field="커리어 성장",
        )

        self.assertEqual(result, 59000)
        self.assertIn("자기개발 관심 분야", captured["prompt"])
        self.assertIn("커리어 성장", captured["prompt"])
