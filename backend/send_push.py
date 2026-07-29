import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification

try:
    profile = UserProfile.objects.get(user__username='ajay')
    if profile.fcm_token:
        title = "🚀 Naya OTA Update Aa Gaya Hai!"
        body = "Is message par tap karein jo aapko app me Profile page me le jayega. Phir wahan 'Check for Update' button par tap karke naye features ka maza lein! ✨"
        data = {"screen": "Profile"}
        
        success = send_push_notification(profile.fcm_token, title, body, data)
        if success:
            print("Push notification sent successfully!")
        else:
            print("Failed to send push notification.")
    else:
        print("No FCM token found for user ajay.")
except Exception as e:
    print(f"Error: {e}")
