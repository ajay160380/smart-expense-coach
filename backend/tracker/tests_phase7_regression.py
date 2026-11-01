from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.utils import timezone
from datetime import timedelta
from tracker.models import UserProfile, WhatsAppSession
import json

class Phase7RegressionTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="regression_user", password="PassWord123!")
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number="919876543210",
            whatsapp_number="919876543210"
        )
        self.token = Token.objects.create(user=self.user)

    def test_unauthenticated_bot_endpoint_rejected(self):
        """Calls to WhatsApp bot internal endpoints without secret are rejected."""
        # voice_expense in bot mode without secret
        resp = self.client.post(
            '/api/voice-expense/',
            data=json.dumps({"phone": "919876543210", "text": "100 food"}),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 401)

        # whatsapp_summary without secret
        resp2 = self.client.post(
            '/api/whatsapp-summary/',
            data=json.dumps({"phone": "919876543210"}),
            content_type="application/json"
        )
        self.assertEqual(resp2.status_code, 401)

    def test_old_client_compatibility_without_new_headers(self):
        """Legacy mobile app v1.3.2 requests with normal Token header succeed without deprecation block."""
        resp = self.client.get(
            '/api/profile/',
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )
        self.assertEqual(resp.status_code, 200)

    def test_link_code_generation_and_verification(self):
        """User can generate link code via authenticated API and link WhatsApp account."""
        resp = self.client.post(
            '/api/generate-wa-link-code/',
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        code = data.get("code")
        self.assertTrue(code and len(code) == 6)

    def test_expired_token_rejected_with_401(self):
        """Tokens inactive for over 30 days are rejected with HTTP 401."""
        from django.core.cache import cache
        expired_user = User.objects.create_user(username="expired_reg_user", password="PassWord123!")
        UserProfile.objects.create(user=expired_user)
        expired_token = Token.objects.create(user=expired_user)
        cache.set(f"token_last_used_{expired_token.key}", timezone.now() - timedelta(days=32))

        resp = self.client.get(
            '/api/profile/',
            HTTP_AUTHORIZATION=f"Token {expired_token.key}"
        )
        self.assertEqual(resp.status_code, 401)
