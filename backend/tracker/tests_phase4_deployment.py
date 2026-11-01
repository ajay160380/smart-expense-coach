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
        """Verify that APK endpoints return 302 redirect to Expo CDN."""
        paths = [
            '/download-apk/',
            '/download-apk',
            '/static/downloads/ExpenseTracker.apk',
            '/downloads/ExpenseTracker.apk',
        ]
        for path in paths:
            resp = self.client.get(path)
            self.assertEqual(resp.status_code, 302, f"Path {path} did not return 302")
            self.assertTrue(
                resp.headers.get('Location', '').startswith('https://') or
                resp.headers.get('Location', '').startswith('http://')
            )
