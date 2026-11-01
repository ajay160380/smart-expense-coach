from django.test import TestCase
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from io import StringIO
from tracker.models import OTPVerification, UserLoginActivity
from django.contrib.auth.models import User

class Phase6QualityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test_quality_user", password="TestPass123!")

    def test_purge_old_logs_command(self):
        now = timezone.now()
        # Old records
        old_otp = OTPVerification.objects.create(
            identifier="test@old.com",
            otp_code="hash1",
        )
        OTPVerification.objects.filter(id=old_otp.id).update(created_at=now - timedelta(days=35))

        old_login = UserLoginActivity.objects.create(
            user=self.user,
            ip_address="127.0.0.1",
        )
        UserLoginActivity.objects.filter(id=old_login.id).update(timestamp=now - timedelta(days=95))

        # Recent records
        new_otp = OTPVerification.objects.create(
            identifier="test@new.com",
            otp_code="hash2",
        )
        new_login = UserLoginActivity.objects.create(
            user=self.user,
            ip_address="127.0.0.1",
        )

        out = StringIO()
        call_command('purge_old_logs', days_logs=90, days_otps=30, stdout=out)
        output = out.getvalue()
        self.assertIn("Successfully purged:", output)

        # Verify old deleted, new retained
        self.assertFalse(OTPVerification.objects.filter(id=old_otp.id).exists())
        self.assertTrue(OTPVerification.objects.filter(id=new_otp.id).exists())
        self.assertFalse(UserLoginActivity.objects.filter(id=old_login.id).exists())
        self.assertTrue(UserLoginActivity.objects.filter(id=new_login.id).exists())

    def test_purge_old_logs_dry_run(self):
        now = timezone.now()
        old_otp = OTPVerification.objects.create(
            identifier="test@dryrun.com",
            otp_code="hash3",
        )
        OTPVerification.objects.filter(id=old_otp.id).update(created_at=now - timedelta(days=40))
        out = StringIO()
        call_command('purge_old_logs', days_logs=90, days_otps=30, dry_run=True, stdout=out)
        self.assertIn("[DRY RUN]", out.getvalue())
        self.assertTrue(OTPVerification.objects.filter(id=old_otp.id).exists())
