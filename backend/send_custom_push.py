import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

title = "🌙 Aaj Kahan Udaaye Paise? 🧾"
body = "Din khatam hone wala hai! Aaj ke saare kharche (chai, snacks, shopping) record kar liye ya bhool gaye? 📝⚡"
data = {"screen": "Dashboard"}

print(f"Title: {title}")
print(f"Body: {body}\n")

# Broadcast to topic 'all_users'
try:
    initialize_firebase()
    topic_message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data,
        topic='all_users',
    )
    res = messaging.send(topic_message)
    print("Successfully broadcasted to topic 'all_users':", res)
except Exception as e:
    print("Topic send notice/error:", e)

# Send to individual FCM tokens
profiles = UserProfile.objects.exclude(fcm_token__isnull=True).exclude(fcm_token__exact='')
print(f"Found {profiles.count()} user profiles with FCM token.")

count = 0
for profile in profiles:
    success = send_push_notification(profile.fcm_token, title, body, data)
    if success:
        count += 1
        print(f"✅ Notification sent to user: {profile.user.username}")
    else:
        print(f"❌ Failed to send notification to user: {profile.user.username}")

print(f"\nCompleted! Total individual push notifications sent: {count}")
