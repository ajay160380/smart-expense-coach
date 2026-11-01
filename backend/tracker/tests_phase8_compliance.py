from django.test import TestCase, Client
from django.contrib.auth.models import User
from tracker.models import UserProfile, Expense

class Phase8ComplianceTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="del_user", password="Password123!")
        self.profile = UserProfile.objects.create(user=self.user, phone_number="919876500000")
        self.expense = Expense.objects.create(user=self.user, amount=500, category="food", description="dinner")

    def test_delete_account_page_renders(self):
        resp = self.client.get('/delete-account/')
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Delete Account & Data")

    def test_delete_account_authenticated_success(self):
        self.client.login(username="del_user", password="Password123!")
        resp = self.client.post('/delete-account/', data={'password': 'Password123!'})
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Account Successfully Deleted")
        # Verify user and cascade deleted
        self.assertFalse(User.objects.filter(username="del_user").exists())
        self.assertFalse(Expense.objects.filter(id=self.expense.id).exists())

    def test_delete_account_unauthenticated_wrong_password(self):
        resp = self.client.post('/delete-account/', data={
            'identifier': 'del_user',
            'password': 'WrongPassword!'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(username="del_user").exists())

    def test_delete_account_unauthenticated_success(self):
        resp = self.client.post('/delete-account/', data={
            'identifier': 'del_user',
            'password': 'Password123!'
        })
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "Account Successfully Deleted")
        self.assertFalse(User.objects.filter(username="del_user").exists())

    def test_privacy_and_terms_pages(self):
        resp_priv = self.client.get('/privacy/')
        self.assertEqual(resp_priv.status_code, 200)
        self.assertContains(resp_priv, "Grievance Redressal Officer")
        self.assertContains(resp_priv, "Firebase")
        self.assertContains(resp_priv, "Groq")

        resp_terms = self.client.get('/terms/')
        self.assertEqual(resp_terms.status_code, 200)
        self.assertContains(resp_terms, "Account Deletion Page")
