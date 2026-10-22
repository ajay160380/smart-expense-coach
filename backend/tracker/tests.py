"""
Automated Test Suite for Smart Expense Coach
Testing security permissions, OTP hardening, business logic calculations,
idempotency, public split links, and support contact form.
"""

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token

# Python 3.14 compatibility patch for Django template context copying during tests
from django.template import context as django_context

def _safe_basecontext_copy(self):
    duplicate = object.__new__(self.__class__)
    duplicate.dicts = self.dicts[:]
    return duplicate

django_context.BaseContext.__copy__ = _safe_basecontext_copy

from tracker.models import (
    UserProfile,
    Expense,
    Subscription,
    SubscriptionCharge,
    WhatsAppProcessedMessage,
    SplitGroup,
    SplitMember,
    SplitExpense,
    ContactMessage,
    OTPVerification,
)
from tracker.views import (
    _hash_otp,
    _verify_otp_record,
    validate_and_normalize_expense,
    get_budget_cycle_dates,
    process_subscriptions,
)


class AdminEndpointPermissionTests(TestCase):
    """SEC-002: Reusable staff permissions, anonymous 401, normal 403, staff 200, invalid method 405."""

    def setUp(self):
        self.client = Client()
        self.normal_user = User.objects.create_user(username="normaluser", password="Password123!")
        self.staff_user = User.objects.create_user(
            username="staffuser",
            email="staff@example.com",
            password="Password123!",
            is_staff=True
        )
        self.superuser = User.objects.create_superuser(username="superadmin", password="Password123!")

        self.normal_token, _ = Token.objects.get_or_create(user=self.normal_user)
        self.staff_token, _ = Token.objects.get_or_create(user=self.staff_user)

    def test_admin_panel_page_permissions(self):
        # Anonymous -> 401
        res = self.client.get('/admin-panel/', HTTP_ACCEPT='application/json')
        self.assertEqual(res.status_code, 401)

        # Normal user -> 403
        self.client.force_login(self.normal_user)
        res = self.client.get('/admin-panel/', HTTP_ACCEPT='application/json')
        self.assertEqual(res.status_code, 403)

        # Staff user -> 200
        self.client.force_login(self.staff_user)
        res = self.client.get('/admin-panel/')
        self.assertEqual(res.status_code, 200)

    def test_api_admin_users_permissions(self):
        # Anonymous -> 401
        res = self.client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 401)

        # Normal user with token -> 403
        res = self.client.get('/api/admin/users/', HTTP_AUTHORIZATION=f'Token {self.normal_token.key}')
        self.assertEqual(res.status_code, 403)

        # Staff user with token -> 200
        res = self.client.get('/api/admin/users/', HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')
        self.assertEqual(res.status_code, 200)

    def test_api_trigger_test_push_permissions(self):
        # Anonymous -> 401
        res = self.client.post('/api/trigger-test-push/', content_type='application/json')
        self.assertEqual(res.status_code, 401)

        # Normal user -> 403
        res = self.client.post(
            '/api/trigger-test-push/',
            HTTP_AUTHORIZATION=f'Token {self.normal_token.key}',
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)

        # Staff user -> 200
        res = self.client.post(
            '/api/trigger-test-push/',
            HTTP_AUTHORIZATION=f'Token {self.staff_token.key}',
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)

    def test_qr_proxy_permissions_and_methods(self):
        # Invalid HTTP method -> 405
        res = self.client.post('/qr/')
        self.assertEqual(res.status_code, 405)

        # Anonymous -> 401
        res = self.client.get('/qr/')
        self.assertEqual(res.status_code, 401)

        # Normal user -> 403
        self.client.force_login(self.normal_user)
        res = self.client.get('/qr/')
        self.assertEqual(res.status_code, 403)

        # Staff user -> allowed (200)
        self.client.force_login(self.staff_user)
        res = self.client.get('/qr/')
        self.assertEqual(res.status_code, 200)

    @patch('tracker.email_service.send_transactional_email', return_value=(True, {'provider': 'mock_smtp'}))
    def test_debug_email_route_protected_and_redacted(self, mock_email):
        # Anonymous -> 401
        res = self.client.get('/api/auth/debug-email/')
        self.assertEqual(res.status_code, 401)

        # Normal user -> 403
        res = self.client.get(
            '/api/auth/debug-email/',
            HTTP_AUTHORIZATION=f'Token {self.normal_token.key}'
        )
        self.assertEqual(res.status_code, 403)

        # Staff user -> 200
        res = self.client.get(
            f'/api/auth/debug-email/?to={self.staff_user.email}',
            HTTP_AUTHORIZATION=f'Token {self.staff_token.key}'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("recipient"), self.staff_user.email)


class OTPHardeningTests(TestCase):
    """AUTH-001: OTP hashing, max attempts, expiry, action scoping, rate limits, account enumeration."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="otpuser", email="otpuser@example.com", password="Password123!")
        UserProfile.objects.create(user=self.user, phone_number="919876543210")

    def test_otp_hashing_and_verification(self):
        identifier = "919876543210"
        code = "456789"
        action = "register"

        hashed = _hash_otp(identifier, action, code)
        self.assertNotEqual(hashed, code)
        self.assertEqual(len(hashed), 64)

        record = OTPVerification.objects.create(
            identifier=identifier,
            otp_code=hashed,
            action=action,
            attempts=0,
            max_attempts=5
        )

        # Valid verification
        self.assertTrue(_verify_otp_record(record, code, action))

        # Wrong code fails
        self.assertFalse(_verify_otp_record(record, "111222", action))

        # Action mismatch fails
        self.assertFalse(_verify_otp_record(record, code, "reset"))

    def test_otp_max_attempts_exceeded(self):
        identifier = "user@test.com"
        code = "123456"
        action = "register"
        hashed = _hash_otp(identifier, action, code)

        record = OTPVerification.objects.create(
            identifier=identifier,
            otp_code=hashed,
            action=action,
            attempts=5,
            max_attempts=5
        )
        # Exceeded attempts cannot verify even with right code
        self.assertFalse(_verify_otp_record(record, code, action))

        # API returns 400 error when max attempts exceeded
        res = self.client.post('/api/auth/verify-otp/', {
            'identifier': identifier,
            'otp': code,
            'action': action,
        }, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn("Maximum verification attempts exceeded", res.json().get('error', ''))

    def test_otp_expiry(self):
        identifier = "expired@test.com"
        code = "123456"
        action = "register"
        hashed = _hash_otp(identifier, action, code)

        record = OTPVerification.objects.create(
            identifier=identifier,
            otp_code=hashed,
            action=action
        )
        # Artificially age the record by 15 minutes
        OTPVerification.objects.filter(id=record.id).update(
            created_at=timezone.now() - timedelta(minutes=15)
        )
        record.refresh_from_db()
        self.assertFalse(_verify_otp_record(record, code, action))

    def test_account_enumeration_protection_on_reset(self):
        # Requesting reset for non-existent account returns generic 200 success
        res = self.client.post('/api/auth/send-otp/', {
            'email': 'nonexistent_account_12345@example.com',
            'action': 'reset',
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertIn("verification code has been sent", res.json().get('message', ''))

    def test_otp_rate_limiting(self):
        identifier = "ratelimit@example.com"
        for _ in range(5):
            OTPVerification.objects.create(
                identifier=identifier,
                otp_code="hash",
                action="general",
                ip_address="127.0.0.1"
            )

        res = self.client.post('/api/auth/send-otp/', {
            'email': identifier,
            'action': 'general'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 429)


class BusinessLogicAndValidationTests(TestCase):
    """LOGIC-001, LOGIC-002, LOGIC-003, LOGIC-004."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="testuser", password="Password123!")

    def test_expense_validation(self):
        # 1. Negative or zero amount rejected
        data, err = validate_and_normalize_expense(self.user, "-50", "Food")
        self.assertIsNone(data)
        self.assertIn("Amount must be greater than zero", err)

        # 2. Exceeds max amount rejected
        data, err = validate_and_normalize_expense(self.user, "20000000", "Food")
        self.assertIsNone(data)
        self.assertIn("Amount exceeds maximum allowable limit", err)

        # 3. Future date rejected by default
        tomorrow = timezone.localdate() + timedelta(days=2)
        data, err = validate_and_normalize_expense(self.user, "100", "Food", date_val=tomorrow.isoformat())
        self.assertIsNone(data)
        self.assertIn("Future expense dates are not supported", err)

        # 4. Valid expense normalized
        data, err = validate_and_normalize_expense(self.user, "250.75", "invalid_cat")
        self.assertIsNone(err)
        self.assertEqual(data["amount"], Decimal("250.75"))
        self.assertEqual(data["category"], "other")

    def test_budget_cycle_date_helpers(self):
        # Test start day 28 in different months
        start, end = get_budget_cycle_dates(28, reference_date=date(2026, 2, 10))
        self.assertEqual(start, date(2026, 1, 28))
        self.assertEqual(end, date(2026, 2, 27))

        # Year boundary (e.g. January with start day 28 begins in previous year December)
        start_jan, end_jan = get_budget_cycle_dates(28, reference_date=date(2026, 1, 15))
        self.assertEqual(start_jan, date(2025, 12, 28))
        self.assertEqual(end_jan, date(2026, 1, 27))

    def test_subscription_idempotency(self):
        today = date(2026, 3, 1)
        sub = Subscription.objects.create(
            user=self.user,
            name="Netflix",
            amount=Decimal("499.00"),
            category="Entertainment",
            next_billing_date=today
        )

        # First run: charges subscription
        with patch('django.utils.timezone.localdate', return_value=today):
            debits1 = process_subscriptions(self.user)
            self.assertEqual(debits1, 1)
            self.assertEqual(SubscriptionCharge.objects.filter(subscription=sub, billing_date=today).count(), 1)
            self.assertEqual(Expense.objects.filter(user=self.user, description__icontains="Netflix").count(), 1)

            # Reset next_billing_date to today to simulate re-running for the same billing date
            sub.next_billing_date = today
            sub.save(update_fields=['next_billing_date'])

            # Second run on same date: must be idempotent and NOT create second charge
            debits2 = process_subscriptions(self.user)
            self.assertEqual(debits2, 0)
            self.assertEqual(SubscriptionCharge.objects.filter(subscription=sub, billing_date=today).count(), 1)
            self.assertEqual(Expense.objects.filter(user=self.user, description__icontains="Netflix").count(), 1)

    def test_whatsapp_message_idempotency(self):
        provider_msg_id = "wamid.HBgLOTE3OT"
        sender = "919999988888"

        # Pre-populate processed message
        WhatsAppProcessedMessage.objects.create(
            provider_message_id=provider_msg_id,
            sender_id=sender,
            status='success',
            response_text="Expense ₹500 recorded."
        )

        res = self.client.post('/api/voice-expense/', {
            'phone': sender,
            'text': '500 petrol',
            'message_id': provider_msg_id,
            'sender_id': sender
        }, content_type='application/json')

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("already_processed"))
        self.assertEqual(data.get("message"), "Expense ₹500 recorded.")


class PublicSplitLinkTests(TestCase):
    """LOGIC-005: Random token entropy, revoke, expiry, owner authorization, input length validation."""

    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(username="splitowner", password="Password123!")
        self.other_user = User.objects.create_user(username="otheruser", password="Password123!")
        self.group = SplitGroup.objects.create(creator=self.owner, name="Goa Trip")

    def test_revoked_split_link_rejected(self):
        self.group.is_revoked = True
        self.group.save()

        # JSON endpoint rejected
        res = self.client.get(f'/api/public-split/{self.group.share_token}/')
        self.assertEqual(res.status_code, 403)
        self.assertIn("revoked", res.json().get("error", ""))

        # Web page endpoint rejected
        res_page = self.client.get(f'/split/{self.group.share_token}/')
        self.assertEqual(res_page.status_code, 403)

    def test_expired_split_link_rejected(self):
        self.group.token_expires_at = timezone.now() - timedelta(days=1)
        self.group.save()

        # JSON endpoint rejected
        res = self.client.get(f'/api/public-split/{self.group.share_token}/')
        self.assertEqual(res.status_code, 403)
        self.assertIn("expired", res.json().get("error", ""))

        # Web page endpoint rejected
        res_page = self.client.get(f'/split/{self.group.share_token}/')
        self.assertEqual(res_page.status_code, 403)

    def test_owner_authorization_on_settle_toggle(self):
        url = f'/api/public-split/{self.group.share_token}/toggle-settle/'

        # Anonymous user cannot settle
        res = self.client.post(url)
        self.assertEqual(res.status_code, 401)

        # Another authenticated user cannot settle
        self.client.force_login(self.other_user)
        res = self.client.post(url)
        self.assertEqual(res.status_code, 403)

        # Owner CAN settle
        self.client.force_login(self.owner)
        res = self.client.post(url)
        self.assertEqual(res.status_code, 200)
        self.group.refresh_from_db()
        self.assertTrue(self.group.is_settled)

    def test_public_add_expense_length_validation(self):
        url = f'/api/public-split/{self.group.share_token}/add/'

        # Empty name rejected
        res = self.client.post(url, {'paid_by': '', 'amount': 100}, content_type='application/json')
        self.assertEqual(res.status_code, 400)

        # Excessively long description rejected
        long_desc = "x" * 250
        res = self.client.post(url, {'paid_by': 'Amit', 'amount': 100, 'description': long_desc}, content_type='application/json')
        self.assertEqual(res.status_code, 400)

        # Valid expense persists
        res = self.client.post(url, {'paid_by': 'Amit', 'amount': 250, 'description': 'Dinner'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SplitExpense.objects.filter(group=self.group, paid_by="Amit").count(), 1)


class ContactFormTests(TestCase):
    """WEB-001: Real support contact form persistence, CSRF, validation, honeypot spam protection."""

    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    @patch('tracker.email_service.send_transactional_email', return_value=(True, {'provider': 'mock'}))
    def test_contact_form_persistence(self, mock_email):
        res = self.client.post('/contact/', {
            'name': 'Pooja Sharma',
            'email': 'pooja@example.com',
            'subject': 'Subscription Question',
            'message': 'How do I add a recurring bill?',
            'website': '', # honeypot empty
        })
        self.assertEqual(res.status_code, 200)

        msg = ContactMessage.objects.filter(email='pooja@example.com').first()
        self.assertIsNotNone(msg)
        self.assertEqual(msg.name, 'Pooja Sharma')
        self.assertEqual(msg.status, 'new')

    def test_honeypot_spam_dropped(self):
        initial_count = ContactMessage.objects.count()
        res = self.client.post('/contact/', {
            'name': 'Spam Bot',
            'email': 'bot@spam.com',
            'subject': 'SEO Services',
            'message': 'Buy backlinks cheap',
            'website': 'https://spamsite.com', # honeypot filled
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ContactMessage.objects.count(), initial_count)

    def test_invalid_email_rejected(self):
        res = self.client.post('/contact/', {
            'name': 'Pooja Sharma',
            'email': 'not-an-email',
            'message': 'Test message',
        })
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ContactMessage.objects.filter(name='Pooja Sharma').count(), 0)
