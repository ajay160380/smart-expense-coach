import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

title = "🚀 Track Your Spendings!"
body = "Hey there! Don't forget to log your daily expenses. Keep your budget on track! 💰📈"
data = {"screen": "Dashboard"}

print(f"Title: {title}")
print(f"Body: {body}\n")

# Broadcast to topic 'all_users'
topic_sent = False
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
    topic_sent = True
except Exception as e:
    print("Topic send notice/error:", e)

# Fallback to individual FCM tokens ONLY if topic broadcast failed
if not topic_sent:
    tokens = UserProfile.objects.exclude(fcm_token__isnull=True).exclude(fcm_token__exact='').values_list('fcm_token', flat=True).distinct()
    print(f"Fallback: Found {len(tokens)} unique FCM tokens.")

    count = 0
    for fcm_token in tokens:
        success = send_push_notification(fcm_token, title, body, data)
        if success:
            count += 1
            print(f"✅ Notification sent to token: {fcm_token[:15]}...")
        else:
            print(f"❌ Failed to send notification to token: {fcm_token[:15]}...")

    print(f"\nCompleted! Total individual push notifications sent: {count}")
else:
    print("\nSkipping individual token loop to prevent duplicate notification delivery (since topic broadcast succeeded).")

