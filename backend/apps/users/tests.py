from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from external.ai.client import AIClient

User = get_user_model()


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


class GoogleLoginViewTests(APITestCase):
    @override_settings(
        GOOGLE_OAUTH_ALLOWED_CLIENT_IDS=[
            'local-web.apps.googleusercontent.com',
            'staging-web.apps.googleusercontent.com',
        ]
    )
    @patch('apps.users.oauth_views.requests.get')
    def test_google_login_accepts_any_allowed_client_id(self, mock_get):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'aud': 'staging-web.apps.googleusercontent.com',
            'email': 'google-user@example.com',
            'sub': 'google-user-123',
            'name': 'Google User',
        }
        mock_get.return_value = mock_response

        response = self.client.post(
            '/api/users/auth/google/',
            {
                'credential': 'valid-id-token',
                'client_id': 'staging-web.apps.googleusercontent.com',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], 'google-user@example.com')
        self.assertTrue(User.objects.filter(email='google-user@example.com').exists())

    @override_settings(
        GOOGLE_OAUTH_ALLOWED_CLIENT_IDS=['expected-web.apps.googleusercontent.com']
    )
    @patch('apps.users.oauth_views.requests.get')
    def test_google_login_rejects_unexpected_client_id(self, mock_get):
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {
            'aud': 'different-web.apps.googleusercontent.com',
            'email': 'google-user@example.com',
            'sub': 'google-user-123',
            'name': 'Google User',
        }
        mock_get.return_value = mock_response

        response = self.client.post(
            '/api/users/auth/google/',
            {
                'credential': 'valid-id-token',
                'client_id': 'different-web.apps.googleusercontent.com',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('NEXT_PUBLIC_GOOGLE_CLIENT_ID', response.data['error'])
