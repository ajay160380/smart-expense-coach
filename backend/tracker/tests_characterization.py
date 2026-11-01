"""
Baseline Characterization Tests for PaisaMitra (Smart Expense Coach)
These tests verify that existing user-facing flows behave exactly as expected
before and during production hardening.
"""

from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
import json

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from tracker.models import (
    UserProfile,
    Expense,
    Subscription,
    SavingsGoal,
    Note,
    SplitGroup,
    SplitMember,
    SplitExpense,
    OTPVerification,
)
from tracker.views import _hash_otp


class BaselineCharacterizationTests(TestCase):
    """
    Characterization test suite covering the 16 core product flows:
    1. register
    2. login with password
    3. login with OTP
    4. password reset
    5. add/edit/delete expense
    6. voice expense
    7. AI chat
    8. analytics & safe-to-spend
    9. splits (private and public split links)
    10. savings goals
    11. notes
    12. subscriptions
    13. export CSV/PDF
    14. push token update
    15. daily tips
    16. WhatsApp summary
    """

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()

        # Create standard test user
        self.username = "testuser"
        self.password = "StrongPass123!"
        self.phone = "919876543210"
        self.email = "testuser@example.com"

        self.user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password,
            first_name="Test",
            last_name="User"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number=self.phone,
            whatsapp_number=self.phone,
            whatsapp_linked=True,
            monthly_budget=Decimal("25000.00")
        )
        self.token = Token.objects.create(user=self.user)
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    # 1. REGISTER
    def test_01_register_flow(self):
        reg_phone = "919123456789"
        reg_otp = "123456"
        OTPVerification.objects.create(
            identifier=reg_phone,
            otp_code=reg_otp,
            created_at=timezone.now()
        )

        resp = self.client.post(
            "/api/register/",
            data=json.dumps({
                "username": "newuser",
                "phone_number": "9123456789",
                "otp": reg_otp,
                "password": "Password123!",
                "name": "New User"
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertTrue(User.objects.filter(username="newuser").exists())

    # 2. LOGIN WITH PASSWORD
    def test_02_login_with_password(self):
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({
                "username": self.username,
                "password": self.password
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("token", data)
        self.assertEqual(data["username"], self.username)
        self.assertEqual(data["user_id"], self.user.id)

    # 3. LOGIN WITH OTP
    def test_03_login_with_otp(self):
        otp_code = "123456"
        # Seed unverified OTP record for login
        OTPVerification.objects.create(
            identifier=self.phone,
            otp_code=_hash_otp(self.phone, "login", otp_code),
            action="login",
            is_verified=False,
            created_at=timezone.now()
        )

        login_resp = self.client.post(
            "/api/auth/login-otp/",
            data=json.dumps({
                "identifier": self.phone,
                "otp": otp_code
            }),
            content_type="application/json"
        )
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("token", data)
        self.assertEqual(data["user_id"], self.user.id)

    # 4. PASSWORD RESET
    def test_04_password_reset(self):
        reset_otp = "654321"
        OTPVerification.objects.create(
            identifier=self.phone,
            otp_code=reset_otp,
            action="reset",
            is_verified=True,
            created_at=timezone.now()
        )
        resp = self.client.post(
            "/api/auth/reset-password/",
            data=json.dumps({
                "identifier": self.phone,
                "otp": reset_otp,
                "new_password": "BrandNewPassword123!"
            }),
            content_type="application/json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPassword123!"))

    # 5. ADD / EDIT / DELETE EXPENSE
    def test_05_add_edit_delete_expense(self):
        # Add expense
        add_resp = self.client.post(
            "/api/quick-add/",
            data=json.dumps({
                "amount": 450.00,
                "category": "Food",
                "description": "Lunch meeting",
                "date": str(date.today())
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(add_resp.status_code, 201)
        exp_id = add_resp.json()["expense_id"]

        # Edit expense
        edit_resp = self.client.post(
            f"/api/edit-expense/{exp_id}/",
            data=json.dumps({
                "amount": 500.00,
                "category": "Food",
                "description": "Lunch meeting updated",
                "date": str(date.today())
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(edit_resp.status_code, 200)
        exp = Expense.objects.get(id=exp_id)
        self.assertEqual(exp.amount, Decimal("500.00"))

        # Delete expense
        del_resp = self.client.post(
            f"/api/delete-expense/{exp_id}/",
            **self.auth_headers
        )
        self.assertEqual(del_resp.status_code, 200)
        self.assertFalse(Expense.objects.filter(id=exp_id).exists())

    # 6. VOICE EXPENSE
    @patch("tracker.views._groq_client")
    def test_06_voice_expense(self, mock_groq):
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = json.dumps({
            "action": "log_expenses",
            "expenses": [{"amount": 150, "category": "Food", "description": "chai nashta"}]
        })
        mock_resp = MagicMock(choices=[mock_choice])
        mock_client.chat.completions.create.return_value = mock_resp
        mock_groq.return_value = mock_client

        resp = self.client.post(
            "/api/voice-expense/",
            data=json.dumps({
                "phone": self.phone,
                "text": "150 chai nashta",
                "name": "Test User",
                "message_id": "MSG_001",
                "sender_id": f"{self.phone}@s.whatsapp.net"
            }),
            content_type="application/json",
            HTTP_X_INTERNAL_SECRET=settings.INTERNAL_BOT_SECRET
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("message", data)

    # 7. AI CHAT
    @patch("tracker.views._groq_client")
    def test_07_ai_chat(self, mock_groq):
        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Aapka budget control me hai!"
        mock_resp = MagicMock(choices=[mock_choice])
        mock_client.chat.completions.create.return_value = mock_resp
        mock_groq.return_value = mock_client

        resp = self.client.post(
            "/ai_chat/",
            data=json.dumps({
                "message": "Mera kharcha kaisa chal raha hai?"
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("reply", data)

    # 8. ANALYTICS & SAFE TO SPEND
    def test_08_analytics_and_safe_to_spend(self):
        Expense.objects.create(
            user=self.user,
            amount=Decimal("1200.00"),
            category="Travel",
            description="Train ticket",
            date=date.today()
        )
        # Analytics
        analytics_resp = self.client.get("/api/analytics/", **self.auth_headers)
        self.assertEqual(analytics_resp.status_code, 200)

        # Safe to spend
        s2s_resp = self.client.get("/api/safe-to-spend/", **self.auth_headers)
        self.assertEqual(s2s_resp.status_code, 200)
        s2s_data = s2s_resp.json()
        self.assertIn("safe_limit_today", s2s_data)

    # 9. SPLITS (PRIVATE & PUBLIC LINK)
    def test_09_splits_and_public_split(self):
        # Create group
        create_resp = self.client.post(
            "/api/splits/create/",
            data=json.dumps({
                "name": "Manali Trip",
                "members": ["Test", "Friend1", "Friend2"]
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(create_resp.status_code, 201)
        group_id = create_resp.json()["group_id"]
        group = SplitGroup.objects.get(id=group_id)
        share_token = group.share_token
        self.assertTrue(bool(share_token))

        # Public split view data
        pub_get = self.client.get(f"/api/public-split/{share_token}/")
        self.assertEqual(pub_get.status_code, 200)
        self.assertEqual(pub_get.json()["group_name"], "Manali Trip")

        # Public add expense
        pub_add = self.client.post(
            f"/api/public-split/{share_token}/add/",
            data=json.dumps({
                "title": "Hotel Stay",
                "amount": 3000.00,
                "paid_by": "Test",
                "split_among": ["Test", "Friend1", "Friend2"]
            }),
            content_type="application/json"
        )
        self.assertEqual(pub_add.status_code, 200)

        # Public settle
        pub_settle = self.client.post(
            f"/api/public-split/{share_token}/settle/",
            data=json.dumps({
                "debtor": "Friend1",
                "creditor": "Test",
                "amount": 1000.00
            }),
            content_type="application/json"
        )
        self.assertEqual(pub_settle.status_code, 200)

    # 10. SAVINGS GOALS
    def test_10_savings_goals(self):
        # Add goal
        add_resp = self.client.post(
            "/api/savings-goals/add/",
            data=json.dumps({
                "name": "Laptop",
                "target_amount": 60000.00,
                "icon": "laptop",
                "deadline": str(date.today() + timedelta(days=90))
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(add_resp.status_code, 201)
        goal_id = add_resp.json()["goal_id"]

        # Update goal
        upd_resp = self.client.post(
            f"/api/savings-goals/{goal_id}/update/",
            data=json.dumps({
                "add_amount": 15000.00
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(upd_resp.status_code, 200)

        # Delete goal
        del_resp = self.client.post(
            f"/api/savings-goals/{goal_id}/delete/",
            **self.auth_headers
        )
        self.assertEqual(del_resp.status_code, 200)
        self.assertFalse(SavingsGoal.objects.filter(id=goal_id).exists())

    # 11. NOTES
    def test_11_notes(self):
        # Add note
        add_resp = self.client.post(
            "/api/notes/",
            data=json.dumps({
                "text": "Milk, Eggs, Bread"
            }),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertIn(add_resp.status_code, [200, 201])
        note_id = add_resp.json()["note_id"]

        # List notes
        list_resp = self.client.get("/api/notes/", **self.auth_headers)
        self.assertEqual(list_resp.status_code, 200)

        # Delete note (requires DELETE method)
        del_resp = self.client.delete(f"/api/notes/{note_id}/delete/", **self.auth_headers)
        self.assertEqual(del_resp.status_code, 200)
        self.assertFalse(Note.objects.filter(id=note_id).exists())

    # 12. SUBSCRIPTIONS
    def test_12_subscriptions(self):
        # Create subscription
        sub = Subscription.objects.create(
            user=self.user,
            name="Netflix",
            amount=Decimal("649.00"),
            category="entertainment",
            next_billing_date=date.today() + timedelta(days=15)
        )
        # List subscriptions
        list_resp = self.client.get("/api/subscriptions/", **self.auth_headers)
        self.assertEqual(list_resp.status_code, 200)

        # Delete subscription
        del_resp = self.client.post(f"/delete-sub/{sub.id}/", **self.auth_headers)
        self.assertIn(del_resp.status_code, [200, 302])
        self.assertFalse(Subscription.objects.filter(id=sub.id).exists())

    # 13. EXPORT CSV / PDF
    def test_13_export_csv_and_pdf(self):
        Expense.objects.create(
            user=self.user,
            amount=Decimal("350.00"),
            category="Food",
            description="Lunch",
            date=date.today()
        )
        # CSV Export
        csv_resp = self.client.get("/api/export/csv/", **self.auth_headers)
        self.assertEqual(csv_resp.status_code, 200)
        self.assertEqual(csv_resp["Content-Type"], "text/csv")

        # PDF Export
        pdf_resp = self.client.get("/api/export/pdf/", **self.auth_headers)
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp["Content-Type"], "application/pdf")

    # 14. PUSH TOKEN UPDATE
    def test_14_update_fcm_token(self):
        resp = self.client.post(
            "/api/update-fcm-token/",
            data=json.dumps({"fcm_token": "fcm_test_token_12345"}),
            content_type="application/json",
            **self.auth_headers
        )
        self.assertEqual(resp.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.fcm_token, "fcm_test_token_12345")

    # 15. DAILY TIPS
    def test_15_daily_tips(self):
        tip_resp = self.client.get("/api/daily-tip/", **self.auth_headers)
        self.assertEqual(tip_resp.status_code, 200)
        self.assertIn("tip", tip_resp.json())

    # 16. WHATSAPP SUMMARY
    def test_16_whatsapp_summary(self):
        Expense.objects.create(
            user=self.user,
            amount=Decimal("1500.00"),
            category="Shopping",
            description="Clothes",
            date=date.today()
        )
        resp = self.client.post(
            "/api/whatsapp-summary/",
            data=json.dumps({"phone": self.phone}),
            content_type="application/json",
            HTTP_X_INTERNAL_SECRET=settings.INTERNAL_BOT_SECRET
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("message", data)
