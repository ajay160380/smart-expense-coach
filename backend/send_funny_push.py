import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

# Funny Notification Presets
FUNNY_NOTIFICATIONS = [
    {
        "title": "Bhai, Kidney bechne ka irada hai kya? 🏥💸",
        "body": "Tera bank account keh raha hai: 'Mera itna hi tha bhai... Bye!' Aaj thoda kharcha kam kar le! 😂💳",
        "data": {"screen": "Dashboard"}
    },
    {
        "title": "Zomato ko Ambani banaoge kya? 🍕🍔",
        "body": "Ghar par bhi khana banta hai bhai! Swiggy/Zomato band karo aur aaj ka expense app me log karo! 🏃‍♂️💨",
        "data": {"screen": "Dashboard"}
    },
    {
        "title": "Salary aayi nahi ki udd gayi? 💸⚡",
        "body": "Month ke start me King 👑 aur month end me Bhikari 🥣? Aao jaldi budget set kar lo!",
        "data": {"screen": "Budget"}
    },
    {
        "title": "Alert: Wallet in Critical Condition! 🚨🚑",
        "body": "Tumhare purse me ab sirf duplicate receipts aur aatma bachi hai! Thoda hath rok lo devta! 🙏",
        "data": {"screen": "History"}
    }
]

# Pick a funny notification (default: 0)
notif = FUNNY_NOTIFICATIONS[0]

title = notif["title"]
body = notif["body"]
data = notif["data"]

print("========================================")
print(f"🚀 Sending Funny Push Notification:")
print(f"Title: {title}")
print(f"Body:  {body}")
print("========================================\n")

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
    print("✅ Successfully broadcasted funny notification to topic 'all_users':", res)
    topic_sent = True
except Exception as e:
    print("❌ Topic send notice/error:", e)

if not topic_sent:
    tokens = UserProfile.objects.exclude(fcm_token__isnull=True).exclude(fcm_token__exact='').values_list('fcm_token', flat=True).distinct()
    print(f"Fallback: Sending to {len(tokens)} unique FCM tokens.")

    count = 0
    for fcm_token in tokens:
        success = send_push_notification(fcm_token, title, body, data)
        if success:
            count += 1

    print(f"\nCompleted! Total individual push notifications sent: {count}")
else:
    print("\n✨ Single push delivery complete via 'all_users' topic!")
