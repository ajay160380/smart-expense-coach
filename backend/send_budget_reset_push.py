import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

title = "⏳ New Month Coming Soon (3 Days Left)!"
body = "Just 3 days remaining in this month! Your active budget will automatically reset on the 1st of next month. All current budget details will be safely archived in your History section! 📊✨"
data = {"screen": "History"}

print(f"Title: {title}")
print(f"Body: {body}\n")

# Send to topic 'all_users'
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

# Send to individual user profiles with registered FCM tokens
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
