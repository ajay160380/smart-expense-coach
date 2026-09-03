import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()
from tracker.models import UserProfile
count = UserProfile.objects.exclude(fcm_token=None).exclude(fcm_token="").count()
print(f"Total users with FCM tokens: {count}")
