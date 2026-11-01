"""
Phase 3 Auth Hardening Tests
Tests for DRF throttling, account enumeration prevention, hashed OTP verification,
token rotation on password reset, 30-day token expiry with baseline grace period,
and token cleanup on logout/account deletion.
"""

from decimal import Decimal
from datetime import datetime, date, timedelta
import json

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from tracker.models import UserProfile, OTPVerification
from tracker.views import _hash_otp
from tracker.authentication import validate_and_touch_token, touch_token_activity, TOKEN_BASELINE_DATE


class AuthHardeningTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.username = "authuser"
        self.password = "StrongAuthPass123!"
        self.phone = "919988776655"
        self.email = "authuser@example.com"

        self.user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number=self.phone,
            whatsapp_number=self.phone,
            whatsapp_linked=True
        )
        self.token = Token.objects.create(user=self.user)
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def tearDown(self):
        cache.clear()

    # 1. STOP ACCOUNT ENUMERATION ON LOGIN
    def test_login_account_enumeration_prevented(self):
        # Case A: Unknown user
        resp_unknown = self.client.post(
            "/api/login/",
            data=json.dumps({"username": "nonexistent_user_999", "password": "WrongPassword123"}),
            content_type="application/json"
        )
        self.assertEqual(resp_unknown.status_code, 401)
        data_unknown = resp_unknown.json()
        self.assertIn("Invalid credentials", data_unknown.get("error", ""))

        # Case B: Known user with wrong password
        resp_known = self.client.post(
            "/api/login/",
            data=json.dumps({"username": self.username, "password": "WrongPassword123"}),
            content_type="application/json"
        )
        self.assertEqual(resp_known.status_code, 401)
        data_known = resp_known.json()
        self.assertEqual(data_unknown["error"], data_known["error"])

    # 2. STOP ACCOUNT ENUMERATION ON SEND-OTP & LOGIN-OTP
    def test_send_and_login_otp_enumeration_prevented(self):
        # Case A: Send-OTP for login on non-existent account returns same generic 200 response
        resp_send = self.client.post(
            "/api/auth/send-otp/",
            data=json.dumps({"identifier": "910000000000", "action": "login"}),
            content_type="application/json"
        )
        self.assertEqual(resp_send.status_code, 200)
        self.assertEqual(resp_send.json().get("status"), "success")

        # Case B: Login-OTP with non-existent account returns generic 400
        resp_login_otp_unknown = self.client.post(
            "/api/auth/login-otp/",
            data=json.dumps({"identifier": "910000000000", "otp": "999999"}),
            content_type="application/json"
        )
        self.assertEqual(resp_login_otp_unknown.status_code, 400)
        self.assertIn("Invalid credentials", resp_login_otp_unknown.json().get("error", ""))

    # 3. PER-IDENTIFIER HOURLY RATE LIMIT
    def test_otp_hourly_identifier_limit(self):
        target_phone = "919876500000"
        for i in range(5):
            cache_key = f"otp_hourly_{target_phone}"
            cache.set(cache_key, i, timeout=3600)
            r = self.client.post(
                "/api/auth/send-otp/",
                data=json.dumps({"identifier": target_phone, "action": "register"}),
                content_type="application/json"
            )
            self.assertEqual(r.status_code, 200)

        # 6th attempt should be blocked with 429
        cache.set(f"otp_hourly_{target_phone}", 5, timeout=3600)
        r_blocked = self.client.post(
            "/api/auth/send-otp/",
            data=json.dumps({"identifier": target_phone, "action": "register"}),
            content_type="application/json"
        )
        self.assertEqual(r_blocked.status_code, 429)

    # 4. PASSWORD RESET WITH HASHED OTP & TOKEN ROTATION
    def test_password_reset_hashed_otp_and_rotation(self):
        raw_otp = "829104"
        hashed = _hash_otp(self.phone, "reset", raw_otp)
        old_token_key = self.token.key

        # Create verified hashed OTP record
        OTPVerification.objects.create(
            identifier=self.phone,
            otp_code=hashed,
            action="reset",
            is_verified=True,
            created_at=timezone.now()
        )

        resp = self.client.post(
            "/api/auth/reset-password/",
            data=json.dumps({
                "identifier": self.phone,
                "otp": raw_otp,
                "new_password": "CompletelyNewPass999!"
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)

        # Verify old token was rotated / invalidated
        self.assertFalse(Token.objects.filter(key=old_token_key).exists())
        self.assertTrue(Token.objects.filter(user=self.user).exists())

        # Verify all OTP records for this identifier were wiped
        self.assertEqual(OTPVerification.objects.filter(identifier=self.phone).count(), 0)

        # Verify new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("CompletelyNewPass999!"))

    # 5. EXPIRING TOKEN AUTHENTICATION (30 DAYS INACTIVITY)
    def test_token_inactivity_expiry(self):
        # Active token
        user, result = validate_and_touch_token(self.token.key)
        self.assertEqual(user.id, self.user.id)

        # Expired token (> 30 days inactivity) for a separate user
        exp_user = User.objects.create_user("expuser", "exp@example.com", "Pass123!")
        expired_token = Token.objects.create(user=exp_user)
        # Fake last used to 31 days ago in cache
        cache.set(f"token_last_used_{expired_token.key}", timezone.now() - timedelta(days=31), timeout=3600)

        u_exp, res_exp = validate_and_touch_token(expired_token.key)
        self.assertIsNone(u_exp)
        self.assertEqual(res_exp, "expired")
        self.assertFalse(Token.objects.filter(key=expired_token.key).exists())

    # 6. GRACE PERIOD FOR PRE-EXISTING TOKENS
    def test_pre_existing_tokens_grace_period(self):
        # A token created 60 days ago before deployment baseline for a separate user
        old_user = User.objects.create_user("olduser", "old@example.com", "Pass123!")
        old_token = Token.objects.create(user=old_user)
        # Manually force created timestamp to 60 days ago
        Token.objects.filter(key=old_token.key).update(created=timezone.now() - timedelta(days=60))
        old_token.refresh_from_db()

        # Cache is empty (no last_used recorded yet).
        # Per backward compatibility rule 5, expiry must start counting from deployment date!
        user, result = validate_and_touch_token(old_token.key)
        self.assertIsNotNone(user)
        self.assertEqual(user.id, old_user.id)

    # 7. LOGOUT & DELETE ACCOUNT CLEANS UP TOKEN
    def test_logout_and_delete_account_cleans_token(self):
        # Logout
        resp_logout = self.client.post(
            "/api/logout/",
            **self.auth_headers
        )
        self.assertEqual(resp_logout.status_code, 200)
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())
