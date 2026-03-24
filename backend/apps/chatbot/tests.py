from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.chatbot.services import DuduChatService


class DuduChatServiceTests(SimpleTestCase):
    def setUp(self):
        self.service = DuduChatService.__new__(DuduChatService)

    def test_build_context_uses_character_name_as_assistant_name(self):
        user = SimpleNamespace(
            character_name="배동동",
            username="chan",
            email="chan@example.com",
            hobbies="독서, 산책",
            age=27,
            job="직장인",
        )
        self.service._get_financial_status = lambda _: {
            "monthly_budget": 500000,
            "remaining_budget": 320000,
            "today_spending": 12000,
        }
        self.service._get_active_challenges = lambda _: [
            {"name": "카페 줄이기", "status": "active"},
        ]

        context = self.service.build_context(user)

        self.assertEqual(context["assistant_name"], "배동동")
        self.assertEqual(context["user_profile"]["name"], "배동동")
        self.assertEqual(context["user_profile"]["hobbies"], ["독서", "산책"])

    def test_build_system_prompt_includes_dynamic_assistant_name(self):
        context = {
            "assistant_name": "배동동",
            "user_profile": {
                "name": "배동동",
                "age_group": "20대",
                "job": "직장인",
                "hobbies": ["게임"],
            },
            "financial_status": {
                "monthly_budget": 500000,
                "remaining_budget": 200000,
                "today_spending": 15000,
            },
            "active_challenges": [{"name": "온라인 쇼핑 줄이기", "status": "active"}],
        }

        prompt = self.service._build_system_prompt(context)

        self.assertIn("당신은 '배동동'입니다.", prompt)
        self.assertIn("사용자가 설정한 두둑이 이름은 '배동동'입니다.", prompt)
        self.assertIn("위 정보를 바탕으로 사용자의 메시지에 '배동동'의 페르소나로 답변하세요.", prompt)
        self.assertNotIn("두두의 페르소나로", prompt)
