import os
import django
import time
import random
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.fcm_utils import send_push_notification, initialize_firebase
from firebase_admin import messaging

# Collection of random messages
MESSAGES = [
    {"title": "🚀 Keep tracking!", "body": "Don't forget to add your recent expenses! Keep your budget on track. 💰"},
    {"title": "💡 Tip of the day!", "body": "Small savings everyday make a big difference! Have you checked your dashboard today? 📊"},
    {"title": "☕ Coffee Time?", "body": "Did you buy tea or coffee? Add it to your expenses! 📝"},
    {"title": "💸 Wallet Check", "body": "Review your daily spending and stay on budget. 💸"},
    {"title": "📊 Financial Fitness", "body": "Consistency is key. Log your expenses today! 💪"},
    {"title": "🌟 Time for a quick check!", "body": "Ek baar aaj ke kharche review kar lijiye. Financial fitness zaruri hai! 💸💪"},
    {"title": "🌙 Evening Review", "body": "Din bhar ka hisaab kitab likh liya? Add it before you sleep! 😴"}
]

def send_random_push():
    msg = random.choice(MESSAGES)
    title = msg["title"]
    body = msg["body"]
    data = {"screen": "Dashboard"}
    
    print(f"\n[{datetime.datetime.now()}] Preparing to send push...")
    print(f"Title: {title}")
    print(f"Body: {body}")
    
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
        
    if not topic_sent:
        tokens = UserProfile.objects.exclude(fcm_token__isnull=True).exclude(fcm_token__exact='').values_list('fcm_token', flat=True).distinct()
        print(f"Fallback: Found {len(tokens)} unique FCM tokens.")
        count = 0
        for fcm_token in tokens:
            success = send_push_notification(fcm_token, title, body, data)
            if success: count += 1
        print(f"Completed! Total individual push notifications sent: {count}")
    else:
        print("Skipped individual tokens because topic succeeded.")

def run_daemon():
    print("Daemon started. Will send 2 random messages between 9 AM and 9 PM every day.")
    while True:
        now = datetime.datetime.now()
        # Set active window: 9 AM to 9 PM
        start_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
        end_time = now.replace(hour=21, minute=0, second=0, microsecond=0)
        
        # If it's already past 21:00, schedule for tomorrow
        if now >= end_time:
            start_time += datetime.timedelta(days=1)
            end_time += datetime.timedelta(days=1)
            
        total_seconds = int((end_time - start_time).total_seconds())
        
        time1 = start_time + datetime.timedelta(seconds=random.randint(0, total_seconds))
        time2 = start_time + datetime.timedelta(seconds=random.randint(0, total_seconds))
        
        if time1 > time2:
            time1, time2 = time2, time1
            
        times_to_fire = []
        if time1 > now:
            times_to_fire.append(time1)
        if time2 > now:
            times_to_fire.append(time2)
            
        print(f"\n--- New Day Schedule ---")
        for t in times_to_fire:
            print(f"Push scheduled at: {t}")
            
        for t in times_to_fire:
            # Re-evaluate sleep time just in case of drifts
            sleep_seconds = (t - datetime.datetime.now()).total_seconds()
            if sleep_seconds > 0:
                print(f"[{datetime.datetime.now()}] Sleeping until {t} ({int(sleep_seconds)} seconds)...")
                time.sleep(sleep_seconds)
            send_random_push()
            
        # After sending both for the day, sleep until tomorrow 9 AM
        now = datetime.datetime.now()
        next_day_start = start_time + datetime.timedelta(days=1)
        sleep_until_next_day = (next_day_start - now).total_seconds()
        if sleep_until_next_day > 0:
            print(f"[{datetime.datetime.now()}] Finished today's pushes. Sleeping until {next_day_start} ({int(sleep_until_next_day)} seconds)...")
            time.sleep(sleep_until_next_day)

if __name__ == "__main__":
    try:
        run_daemon()
    except KeyboardInterrupt:
        print("\nDaemon stopped.")
