"""
PHASE 9.5: MANAGEMENT COMMAND TO SEND SCHEDULED BUDGET NOTIFICATIONS
Can be scheduled to run every 15 minutes via cron or Render cron job:
  python manage.py send_scheduled_budget_notifications
"""

from datetime import datetime
import zoneinfo
from django.core.management.base import BaseCommand
from django.db.models import Q
from tracker.models import UserProfile
from tracker.notification_engine import (
    send_morning_budget_push_to_user,
    send_night_summary_push_to_user,
)


class Command(BaseCommand):
    help = "Dispatches scheduled morning budget and nightly summary push notifications respecting user timezones."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force dispatch ignoring current time window check (for manual testing).'
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        profiles = UserProfile.objects.filter(
            Q(morning_budget_push=True) | Q(nightly_summary=True)
        ).exclude(fcm_token__isnull=True).exclude(fcm_token='').select_related('user')

        self.stdout.write(f"Evaluating {profiles.count()} profiles for scheduled budget notifications...")

        morning_sent = 0
        night_sent = 0

        for profile in profiles:
            user = profile.user
            tz_str = getattr(profile, 'timezone_name', 'Asia/Kolkata') or 'Asia/Kolkata'
            try:
                user_tz = zoneinfo.ZoneInfo(tz_str)
            except Exception:
                user_tz = zoneinfo.ZoneInfo('Asia/Kolkata')

            now_local = datetime.now(user_tz)
            local_date = now_local.date()
            local_time_str = now_local.strftime('%H:%M')
            current_minutes = now_local.hour * 60 + now_local.minute

            # 1. Morning Budget Push Check
            if profile.morning_budget_push:
                try:
                    m_hour, m_min = map(int, profile.morning_push_time.split(':'))
                    target_morning_min = m_hour * 60 + m_min
                except Exception:
                    target_morning_min = 8 * 60 # 08:00 default

                # Check if within 15-minute scheduled window or force
                if force or abs(current_minutes - target_morning_min) <= 7:
                    if send_morning_budget_push_to_user(user, target_date=local_date):
                        morning_sent += 1
                        self.stdout.write(self.style.SUCCESS(f"Morning push sent to {user.username} ({local_time_str})"))

            # 2. Nightly Summary Push Check
            if profile.nightly_summary:
                try:
                    n_hour, n_min = map(int, profile.nightly_push_time.split(':'))
                    target_night_min = n_hour * 60 + n_min
                except Exception:
                    target_night_min = 22 * 60 # 22:00 default

                if force or abs(current_minutes - target_night_min) <= 7:
                    if send_night_summary_push_to_user(user, target_date=local_date):
                        night_sent += 1
                        self.stdout.write(self.style.SUCCESS(f"Nightly push sent to {user.username} ({local_time_str})"))

        self.stdout.write(self.style.SUCCESS(
            f"Finished scheduled notification dispatch. Morning: {morning_sent}, Night: {night_sent}."
        ))
