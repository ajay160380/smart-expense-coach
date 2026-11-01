import json
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase, Client, override_settings
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

    def test_daily_budget_cycle_day_1_and_end(self):
        """9.1: Test edge cases: day 1 of cycle and last day of cycle"""
        start_date, end_date = get_budget_cycle_dates(self.user, date(2026, 11, 1))
        # Day 1
        data_day1 = calculate_daily_budget(self.user, target_date=start_date)
        self.assertEqual(data_day1['day_of_cycle'], 1)
        self.assertEqual(data_day1['days_left'], data_day1['total_days_in_cycle'])

        # End of cycle
        data_end = calculate_daily_budget(self.user, target_date=end_date)
        self.assertEqual(data_end['day_of_cycle'], data_end['total_days_in_cycle'])
        self.assertEqual(data_end['days_left'], 1)

    def test_baseline_defaults_preserved(self):
        """Rule: Every Phase 9 feature defaults to OFF, preserving 100% existing baseline behavior"""
        fresh_user = User.objects.create_user(username='p9fresh', password='Password123!', email='p9fresh@test.com')
        fresh_profile = UserProfile.objects.create(user=fresh_user, monthly_budget=20000)

        # Verify all new fields default to OFF / None / safe values
        self.assertFalse(fresh_profile.daily_budget_rollover)
        self.assertEqual(fresh_profile.daily_budget_basis, 'budget')
        self.assertIsNone(fresh_profile.monthly_income)
        self.assertFalse(fresh_profile.auto_capture_enabled)
        self.assertFalse(fresh_profile.live_budget_alerts)
        self.assertFalse(fresh_profile.morning_budget_push)
        self.assertFalse(fresh_profile.nightly_summary)
        self.assertFalse(fresh_profile.repeat_nudges)
        self.assertEqual(fresh_profile.notification_tone, 'normal')

        # Existing safe-to-spend endpoint continues working unchanged
        token = Token.objects.create(user=fresh_user)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = c.get('/api/safe-to-spend/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('safe_limit_today', data)
        self.assertIn('remaining_today', data)



class Phase9AutoExpenseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='p9autouser', password='Password123!', email='p9auto@test.com')
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number='9876543211',
            monthly_budget=20000,
            live_budget_alerts=True
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_auto_expense_creation_and_category_mapping(self):
        """9.3: Test auto-expense creation and automated category mapping"""
        res = self.client.post('/api/auto-expense/', {
            'amount': '350.00',
            'merchant': 'Zepto Quick Grocery',
            'source': 'upi',
            'client_txn_id': 'txn_zepto_001'
        }, format='json')

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'success')
        self.assertEqual(res.data['amount'], 350.0)
        self.assertEqual(res.data['category'], 'food') # Zepto mapped to groceries/food
        self.assertEqual(res.data['source'], 'upi')
        self.assertFalse(res.data['is_reviewed'])

        # Verify in DB
        expense = Expense.objects.get(id=res.data['expense_id'])
        self.assertEqual(expense.source, 'upi')
        self.assertEqual(expense.client_txn_id, 'txn_zepto_001')
        self.assertFalse(expense.is_reviewed)

    def test_auto_expense_idempotency(self):
        """9.3: Same client_txn_id should return duplicate without creating second row"""
        payload = {
            'amount': '250.00',
            'merchant': 'Starbucks',
            'source': 'upi',
            'client_txn_id': 'txn_starbucks_unique_123'
        }
        res1 = self.client.post('/api/auto-expense/', payload, format='json')
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post('/api/auto-expense/', payload, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data['status'], 'duplicate')
        self.assertTrue(res2.data.get('is_idempotent'))

        # DB should have exactly 1 expense
        self.assertEqual(Expense.objects.filter(client_txn_id='txn_starbucks_unique_123').count(), 1)

    def test_auto_expense_review_actions(self):
        """9.3: Test review actions: confirm, update_category, undo/delete"""
        # Create auto expense
        res = self.client.post('/api/auto-expense/', {
            'amount': '800.00',
            'merchant': 'Zara Mall',
            'source': 'bank',
            'client_txn_id': 'txn_zara_01'
        }, format='json')
        expense_id = res.data['expense_id']

        # 1. Update Category & remember preference
        rev_res = self.client.post('/api/auto-expense/review/', {
            'expense_id': expense_id,
            'action': 'update_category',
            'new_category': 'shopping'
        }, format='json')
        self.assertEqual(rev_res.status_code, 200)
        expense = Expense.objects.get(id=expense_id)
        self.assertEqual(expense.category, 'shopping')
        self.assertTrue(expense.is_reviewed)

        # Verify memory created
        pref = UserMerchantCategory.objects.filter(user=self.user, merchant='zara mall').first()
        self.assertIsNotNone(pref)
        self.assertEqual(pref.category, 'shopping')

        # 2. Undo / Delete
        undo_res = self.client.post('/api/auto-expense/review/', {
            'expense_id': expense_id,
            'action': 'undo'
        }, format='json')
        self.assertEqual(undo_res.status_code, 200)
        self.assertFalse(Expense.objects.filter(id=expense_id).exists())


class Phase9NotificationsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='p9notifuser', password='Password123!', email='p9notif@test.com')
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number='9876543212',
            monthly_budget=30000,
            fcm_token='test-fcm-token-xyz',
            morning_budget_push=True,
            nightly_summary=True,
            repeat_nudges=True,
            notification_tone='normal'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_morning_and_night_message_generation(self):
        """9.5: Test generation of morning & night messages with numbers"""
        from tracker.notification_engine import build_morning_message, build_night_message
        target_date = date(2026, 11, 10)

        # Morning message
        morning_msg = build_morning_message(self.user, target_date)
        self.assertIn("1,000", morning_msg) # 30000 / 30 = 1000

        # Roast morning message
        self.profile.notification_tone = 'roast'
        self.profile.save()
        roast_morning = build_morning_message(self.user, target_date)
        self.assertIn("1,000", roast_morning)

        # Night message under budget
        Expense.objects.create(user=self.user, amount=Decimal('300.00'), category='food', date=target_date)
        night_msg, status = build_night_message(self.user, target_date)
        self.assertEqual(status, 'ok')
        self.assertIn("700", night_msg) # 1000 - 300 = 700 saved

    def test_push_idempotency_sent_once_per_day(self):
        """9.5: Morning & Night pushes must be sent exactly once per user per day"""
        from tracker.notification_engine import send_morning_budget_push_to_user, send_night_summary_push_to_user
        target_date = date(2026, 11, 10)

        # First morning send
        sent1 = send_morning_budget_push_to_user(self.user, target_date=target_date)
        self.assertTrue(sent1)
        self.assertEqual(DailyNotificationLog.objects.filter(user=self.user, notification_type='morning').count(), 1)

        # Duplicate morning send on same day blocked by idempotency
        sent2 = send_morning_budget_push_to_user(self.user, target_date=target_date)
        self.assertFalse(sent2)
        self.assertEqual(DailyNotificationLog.objects.filter(user=self.user, notification_type='morning').count(), 1)

        # Night push
        sent_night1 = send_night_summary_push_to_user(self.user, target_date=target_date)
        self.assertTrue(sent_night1)

        sent_night2 = send_night_summary_push_to_user(self.user, target_date=target_date)
        self.assertFalse(sent_night2)

    def test_repeat_merchant_nudge(self):
        """9.5: Repeat merchant nudge triggers on 2+ same merchant transactions"""
        from tracker.notification_engine import check_and_send_repeat_merchant_nudge
        target_date = date(2026, 11, 10)

        # 1 transaction: should not trigger
        Expense.objects.create(user=self.user, amount=Decimal('250.00'), category='food', description='Zepto order', date=target_date)
        res1 = check_and_send_repeat_merchant_nudge(self.user, 'Zepto', target_date)
        self.assertFalse(res1)

        # 2nd transaction: triggers nudge!
        Expense.objects.create(user=self.user, amount=Decimal('400.00'), category='food', description='Zepto snacks', date=target_date)
        res2 = check_and_send_repeat_merchant_nudge(self.user, 'Zepto', target_date)
        self.assertTrue(res2)

        # 3rd transaction on same day: blocked by max 1 per merchant per day
        res3 = check_and_send_repeat_merchant_nudge(self.user, 'Zepto', target_date)
        self.assertFalse(res3)

    def test_notification_settings_api(self):
        """9.8: GET and POST /api/notification-settings/"""
        get_res = self.client.get('/api/notification-settings/')
        self.assertEqual(get_res.status_code, 200)
        self.assertTrue(get_res.data['morning_budget_push'])
        self.assertTrue(get_res.data['nightly_summary'])

        post_res = self.client.post('/api/notification-settings/', {
            'morning_budget_push': False,
            'notification_tone': 'roast',
            'morning_push_time': '07:30'
        }, format='json')
        self.assertEqual(post_res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.morning_budget_push)
        self.assertEqual(self.profile.notification_tone, 'roast')
        self.assertEqual(self.profile.morning_push_time, '07:30')

    def test_quiet_hours_and_live_budget_alerts(self):
        """9.4: Live alerts respect quiet hours (11 PM - 7 AM) and max 10/day"""
        from datetime import datetime
        from tracker.notification_engine import send_live_budget_alert

        self.profile.live_budget_alerts = True
        self.profile.save()

        exp = Expense.objects.create(user=self.user, amount=Decimal('250.00'), description='Coffee', category='food', date=date(2026, 11, 15))

        # Quiet hour: 23:30 (11:30 PM) -> Should be blocked
        dt_night = timezone.make_aware(datetime(2026, 11, 15, 23, 30))
        sent, reason = send_live_budget_alert(self.user, exp, current_time=dt_night)
        self.assertFalse(sent)
        self.assertIn("Quiet hours", reason)

        # Quiet hour: 05:00 (5 AM) -> Should be blocked
        dt_early = timezone.make_aware(datetime(2026, 11, 15, 5, 0))
        sent, reason = send_live_budget_alert(self.user, exp, current_time=dt_early)
        self.assertFalse(sent)
        self.assertIn("Quiet hours", reason)

        # Daytime: 14:00 (2 PM) -> Allowed!
        dt_day = timezone.make_aware(datetime(2026, 11, 15, 14, 0))
        sent, msg = send_live_budget_alert(self.user, exp, current_time=dt_day)
        self.assertTrue(sent)
        self.assertIn("Coffee -₹250", msg)
        self.assertIn("Aaj ka bacha", msg)



class Phase9MoneyBreakdownTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='p9breakdownuser', password='Password123!', email='p9breakdown@test.com')
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number='9876543213',
            monthly_budget=60000,
            budget_cycle_start_day=1
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_money_breakdown_categories_and_top_merchants(self):
        """9.6: Test GET /api/money-breakdown/ returns 7 buckets, top 5 merchants, and daily status"""
        today = date.today()
        # Create expenses across categories
        Expense.objects.create(user=self.user, amount=Decimal('500.00'), category='food', description='Swiggy lunch', date=today)
        Expense.objects.create(user=self.user, amount=Decimal('400.00'), category='food', description='Swiggy dinner', date=today)
        Expense.objects.create(user=self.user, amount=Decimal('600.00'), category='groceries', description='Blinkit veggies', date=today)
        Expense.objects.create(user=self.user, amount=Decimal('1500.00'), category='shopping', description='Amazon headphones', date=today)
        Expense.objects.create(user=self.user, amount=Decimal('300.00'), category='transport', description='Uber cab', date=today)
        Expense.objects.create(user=self.user, amount=Decimal('200.00'), category='other', description='Chai tapri UPI', date=today)

        res = self.client.get('/api/money-breakdown/?period=today')
        self.assertEqual(res.status_code, 200)
        data = res.data

        self.assertEqual(data['period'], 'today')
        self.assertEqual(Decimal(str(data['total_spent'])), Decimal('3500.00'))

        # Check buckets
        categories = {c['key']: c for c in data['categories']}
        self.assertEqual(Decimal(str(categories['food']['amount'])), Decimal('900.00'))
        self.assertEqual(Decimal(str(categories['groceries']['amount'])), Decimal('600.00'))
        self.assertEqual(Decimal(str(categories['shopping']['amount'])), Decimal('1500.00'))
        self.assertEqual(Decimal(str(categories['transport']['amount'])), Decimal('300.00'))
        self.assertEqual(Decimal(str(categories['other']['amount'])), Decimal('200.00'))

        # Check top merchants
        top_merchants = data['top_merchants']
        self.assertTrue(len(top_merchants) > 0)
        top_names = [m['merchant'].lower() for m in top_merchants]
        self.assertIn('amazon headphones', top_names)
        self.assertIn('swiggy lunch', top_names)

        # Check daily budget status
        self.assertIn('daily_budget_status', data)
        self.assertEqual(data['daily_budget_status']['daily_budget'], 2000.0) # 60000 / 30 = 2000
        self.assertEqual(data['daily_budget_status']['spent_today'], 3500.0)
        self.assertEqual(data['daily_budget_status']['status'], 'over')

    def test_recurring_payments_detection(self):
        """9.6: Test automatic recurring payment detection (Netflix 3 months in a row)"""
        today = date.today()
        from datetime import timedelta
        # 3 charges roughly 30 days apart
        Expense.objects.create(user=self.user, amount=Decimal('649.00'), category='entertainment', description='Netflix Subscription', date=today - timedelta(days=60))
        Expense.objects.create(user=self.user, amount=Decimal('649.00'), category='entertainment', description='Netflix Subscription', date=today - timedelta(days=30))
        Expense.objects.create(user=self.user, amount=Decimal('649.00'), category='entertainment', description='Netflix Subscription', date=today)

        res = self.client.get('/api/money-breakdown/?period=month')
        self.assertEqual(res.status_code, 200)
        recurring = res.data.get('recurring_candidates', [])
        self.assertTrue(len(recurring) >= 1)
        netflix_candidate = next((r for r in recurring if 'netflix' in r['merchant'].lower()), None)
        self.assertIsNotNone(netflix_candidate)
        self.assertEqual(Decimal(str(netflix_candidate['amount'])), Decimal('649.00'))


class Phase9WhatsAppCommandsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='p9wauser', password='Password123!', email='p9wa@test.com', first_name='Rohan')
        self.profile = UserProfile.objects.create(
            user=self.user,
            phone_number='919876543210',
            whatsapp_number='919876543210',
            whatsapp_linked=True,
            monthly_budget=30000,
            budget_cycle_start_day=1
        )
        self.client = Client()
        self.secret = 'test-internal-bot-secret'

    @override_settings(INTERNAL_BOT_SECRET='test-internal-bot-secret')
    def test_aaj_ka_budget_command(self):
        """9.7: Test 'aaj ka budget' returns daily budget, spent, remaining, days left, advice"""
        today = date.today()
        Expense.objects.create(user=self.user, amount=Decimal('500.00'), category='food', date=today)

        res = self.client.post(
            '/api/voice-expense/',
            data=json.dumps({
                'phone': '919876543210',
                'text': 'aaj ka budget',
                'message_id': 'msg_wa_001',
                'sender_id': '919876543210'
            }),
            content_type='application/json',
            HTTP_X_INTERNAL_SECRET=self.secret
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('Daily Budget', data['message'])
        self.assertIn('Spent Today', data['message'])
        self.assertIn('500', data['message'])
        self.assertEqual(data['daily_budget']['spent_today'], 500.0)

    @override_settings(INTERNAL_BOT_SECRET='test-internal-bot-secret')
    def test_today_budget_case_insensitive(self):
        """9.7: Test 'Today Budget' works case-insensitively"""
        res = self.client.post(
            '/api/voice-expense/',
            data=json.dumps({
                'phone': '919876543210',
                'text': 'Today Budget?',
                'message_id': 'msg_wa_002',
                'sender_id': '919876543210'
            }),
            content_type='application/json',
            HTTP_X_INTERNAL_SECRET=self.secret
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('Daily Budget', data['message'])

    @override_settings(INTERNAL_BOT_SECRET='test-internal-bot-secret')
    def test_aaj_ka_budget_no_budget_prompt(self):
        """9.7: When no budget or income is set, reply asking to set it"""
        self.profile.monthly_budget = 0
        self.profile.monthly_income = None
        self.profile.save()

        res = self.client.post(
            '/api/voice-expense/',
            data=json.dumps({
                'phone': '919876543210',
                'text': 'aaj ka budget',
                'message_id': 'msg_wa_003',
                'sender_id': '919876543210'
            }),
            content_type='application/json',
            HTTP_X_INTERNAL_SECRET=self.secret
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('monthly budget set nahi hai', data['message'])






