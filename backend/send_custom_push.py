import os
import sys
import argparse
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

def main():
    parser = argparse.ArgumentParser(description="Send custom push notifications to Expense Tracker users")
    parser.add_argument("--title", type=str, default="🔒 Biometric App Lock is Here!", help="Notification title")
    parser.add_argument("--body", type=str, default="Apne kharchon ko secure karein! Profile me jaakar Fingerprint ya Face ID lock abhi ON karein. 🛡️", help="Notification body text")
    parser.add_argument("--screen", type=str, default="Profile", help="Target screen navigation name")
    parser.add_argument("--topic", type=str, default="all_users", help="FCM topic to broadcast to")
    parser.add_argument("--dry-run", action="store_true", help="Print payload without sending")
    args = parser.parse_args()

    title = args.title
    body = args.body
    data = {"screen": args.screen}

    print(f"Title: {title}")
    print(f"Body:  {body}")
    print(f"Data:  {data}")
    print(f"Topic: {args.topic}\n")

    if args.dry_run:
        print("🔍 Dry-run mode enabled. No notifications sent.")
        return

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
            topic=args.topic,
        )
        res = messaging.send(topic_message)
        print(f"Successfully broadcasted to topic '{args.topic}':", res)
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

if __name__ == '__main__':
    main()

