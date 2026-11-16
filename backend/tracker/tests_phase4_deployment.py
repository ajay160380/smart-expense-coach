from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch

class HealthCheckAndDeploymentTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_check_endpoint(self):
        """Readiness probe returns 200 and baseline structure when DB is connected."""
        response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('service'), 'ExpenseTracker')
        self.assertIn('version', data)
        self.assertIn('timestamp', data)

    def test_health_live_endpoint(self):
        """Liveness probe returns 200 without touching DB."""
        response = self.client.get('/health/live/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('status'), 'ok')
        self.assertEqual(data.get('service'), 'ExpenseTracker')

    def test_apk_download_redirect_middleware(self):
        """Verify that APK endpoints return 200 for landing page or 302 for direct redirect."""
        resp = self.client.get('/download-apk/')
        self.assertEqual(resp.status_code, 200)

        direct_paths = [
            '/download-apk/?direct=1',
            '/static/downloads/ExpenseTracker.apk',
            '/downloads/ExpenseTracker.apk',
        ]
        for path in direct_paths:
            resp = self.client.get(path)
            self.assertIn(resp.status_code, [200, 302], f"Path {path} did not return 200 or 302")

    def test_voice_expense_apk_download_intent(self):
        """Verify that voice_expense immediately detects APK download intent."""
        from tracker.views import _is_apk_download_request
        
        # Valid intents
        self.assertTrue(_is_apk_download_request("apk"))
        self.assertTrue(_is_apk_download_request("app link"))
        self.assertTrue(_is_apk_download_request("apk link bhejo"))
        self.assertTrue(_is_apk_download_request("app download kaise kare"))
        self.assertTrue(_is_apk_download_request("kahan se download kare"))

        # Non-intents (expenses or linking)
        self.assertFalse(_is_apk_download_request("500 petrol"))
        self.assertFalse(_is_apk_download_request("link 123456"))
        self.assertFalse(_is_apk_download_request("apple 50"))
