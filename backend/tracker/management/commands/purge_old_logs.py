from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tracker.models import (
    AppErrorLog,
    AppAnalyticsEvent,
    OTPVerification,
    UserLoginActivity,
    WhatsAppProcessedMessage,
)

class Command(BaseCommand):
    help = "Purge old application logs, analytics events, login records, and expired OTPs older than specified days."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-logs',
            type=int,
            default=90,
            help="Number of days to keep app error logs, analytics events, and processed messages (default: 90 days)",
        )
        parser.add_argument(
            '--days-otps',
            type=int,
            default=30,
            help="Number of days to keep OTP verification records (default: 30 days)",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simulate the purge and report how many records would be deleted without actually deleting them.",
        )

    def handle(self, *args, **options):
        days_logs = options['days_logs']
        days_otps = options['days_otps']
        dry_run = options['dry_run']

        now = timezone.now()
        logs_cutoff = now - timedelta(days=days_logs)
        otps_cutoff = now - timedelta(days=days_otps)

        self.stdout.write(f"Purging logs older than {days_logs} days ({logs_cutoff.strftime('%Y-%m-%d %H:%M:%S')})...")
        self.stdout.write(f"Purging OTPs older than {days_otps} days ({otps_cutoff.strftime('%Y-%m-%d %H:%M:%S')})...")

        # 1. AppErrorLog
        error_qs = AppErrorLog.objects.filter(created_at__lt=logs_cutoff)
        error_count = error_qs.count()
        if not dry_run:
            deleted_errors = error_qs.delete()[0]
        else:
            deleted_errors = error_count

        # 2. AppAnalyticsEvent
        analytics_qs = AppAnalyticsEvent.objects.filter(created_at__lt=logs_cutoff)
        analytics_count = analytics_qs.count()
        if not dry_run:
            deleted_analytics = analytics_qs.delete()[0]
        else:
            deleted_analytics = analytics_count

        # 3. UserLoginActivity
        login_qs = UserLoginActivity.objects.filter(timestamp__lt=logs_cutoff)
        login_count = login_qs.count()
        if not dry_run:
            deleted_logins = login_qs.delete()[0]
        else:
            deleted_logins = login_count

        # 4. WhatsAppProcessedMessage
        wa_qs = WhatsAppProcessedMessage.objects.filter(created_at__lt=logs_cutoff)
        wa_count = wa_qs.count()
        if not dry_run:
            deleted_wa = wa_qs.delete()[0]
        else:
            deleted_wa = wa_count

        # 5. OTPVerification
        otp_qs = OTPVerification.objects.filter(created_at__lt=otps_cutoff)
        otp_count = otp_qs.count()
        if not dry_run:
            deleted_otps = otp_qs.delete()[0]
        else:
            deleted_otps = otp_count

        prefix = "[DRY RUN] Would delete: " if dry_run else "Successfully purged: "
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}\n"
            f"  - AppErrorLog: {deleted_errors}\n"
            f"  - AppAnalyticsEvent: {deleted_analytics}\n"
            f"  - UserLoginActivity: {deleted_logins}\n"
            f"  - WhatsAppProcessedMessage: {deleted_wa}\n"
            f"  - OTPVerification: {deleted_otps}"
        ))
