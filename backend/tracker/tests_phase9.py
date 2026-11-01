from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from tracker.models import UserProfile, Expense, DailyNotificationLog, UserMerchantCategory
from tracker.views import calculate_daily_budget, get_budget_cycle_dates

class Phase9DailyBudgetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='phase9user', password='Password123!', email='p9@test.com')
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number='9876543210',
            monthly_budget=30000,
            budget_cycle_start_day=1,
            daily_budget_basis='budget',
            daily_budget_rollover=False
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_daily_budget_calculation_standard(self):
        """9.1: Test standard daily budget without rollover: 30,000 / 30 = 1,000/day"""
        target_date = date(2026, 11, 15)
        # Add expense of 400 today
        Expense.objects.create(user=self.user, amount=Decimal('400.00'), category='Food', date=target_date)

        data = calculate_daily_budget(self.user, target_date=target_date)
        self.assertEqual(data['base_amount'], 30000.0)
        self.assertEqual(data['total_days_in_cycle'], 30)
        self.assertEqual(data['daily_budget'], 1000.0)
        self.assertEqual(data['spent_today'], 400.0)
        self.assertEqual(data['today_remaining'], 600.0)
        self.assertEqual(data['percent_used'], 40.0)
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['day_of_cycle'], 15)
        self.assertEqual(data['days_left'], 16)
        self.assertEqual(len(data['today_transactions']), 1)

    def test_daily_budget_rollover(self):
        """9.1: Test rollover enabled: unspent amount from prior days carries forward"""
        self.profile.daily_budget_rollover = True
        self.profile.save()

        # Day 1 to 14 expected = 14 * 1000 = 14,000.
        # Suppose user spent only 10,000 in days 1-14.
        Expense.objects.create(user=self.user, amount=Decimal('10000.00'), category='Shopping', date=date(2026, 11, 5))

        target_date = date(2026, 11, 15) # Day 15
        Expense.objects.create(user=self.user, amount=Decimal('500.00'), category='Food', date=target_date)

        data = calculate_daily_budget(self.user, target_date=target_date)
        # Prior carryover = 14,000 - 10,000 = 4,000
        # Effective today's budget = 1,000 + 4,000 = 5,000
        self.assertEqual(data['carryover_amount'], 4000.0)
        self.assertEqual(data['daily_budget'], 5000.0)
        self.assertEqual(data['spent_today'], 500.0)
        self.assertEqual(data['today_remaining'], 4500.0)
        self.assertEqual(data['status'], 'ok')

    def test_daily_budget_basis_income(self):
        """9.2: When daily_budget_basis == 'income', monthly_income drives the daily budget"""
        self.profile.monthly_income = Decimal('60000.00')
        self.profile.daily_budget_basis = 'income'
        self.profile.save()

        target_date = date(2026, 11, 10)
        data = calculate_daily_budget(self.user, target_date=target_date)
        # 60,000 / 30 = 2,000/day
        self.assertEqual(data['base_amount'], 60000.0)
        self.assertEqual(data['daily_budget'], 2000.0)
        self.assertEqual(data['basis'], 'income')

    def test_daily_budget_status_thresholds(self):
        """9.1: Check ok (<70%), warning (70-100%), over (>100%) statuses"""
        target_date = date(2026, 11, 10) # Daily budget = 1,000

        # Case 1: 500 spent -> 50% -> 'ok'
        e = Expense.objects.create(user=self.user, amount=Decimal('500.00'), category='Food', date=target_date)
        data = calculate_daily_budget(self.user, target_date=target_date)
        self.assertEqual(data['status'], 'ok')

        # Case 2: 850 spent -> 85% -> 'warning'
        e.amount = Decimal('850.00')
        e.save()
        data = calculate_daily_budget(self.user, target_date=target_date)
        self.assertEqual(data['status'], 'warning')

        # Case 3: 1200 spent -> 120% -> 'over'
        e.amount = Decimal('1200.00')
        e.save()
        data = calculate_daily_budget(self.user, target_date=target_date)
        self.assertEqual(data['status'], 'over')
        self.assertEqual(data['today_remaining'], -200.0)

    def test_api_daily_budget_get_and_post(self):
        """9.1 & 9.2: GET and POST /api/daily-budget/"""
        # GET
        res = self.client.get('/api/daily-budget/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('daily_budget', res.data)
        self.assertIn('today_remaining', res.data)
        self.assertIn('status', res.data)
        self.assertIn('day_of_cycle', res.data)

        # POST updates monthly_income and basis
        post_res = self.client.post('/api/daily-budget/', {
            'monthly_income': 90000,
            'daily_budget_basis': 'income',
            'daily_budget_rollover': True
        }, format='json')
        self.assertEqual(post_res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(float(self.profile.monthly_income), 90000.0)
        self.assertEqual(self.profile.daily_budget_basis, 'income')
        self.assertTrue(self.profile.daily_budget_rollover)
        self.assertEqual(post_res.data['basis'], 'income')
