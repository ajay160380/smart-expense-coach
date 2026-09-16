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

MORNING_MESSAGES = [
    {"title": "🌅 Good Morning!", "body": "Naya din, nayi shuruaat! Apna budget check karna na bhoolein. 💰"},
    {"title": "☕ Morning Chai/Coffee?", "body": "Did you grab a coffee? Log that expense to keep your budget on track! 📝"},
    {"title": "🚀 Wake up and win!", "body": "Start your day by reviewing your financial goals. You got this! 💪"},
    {"title": "🌞 Happy Morning!", "body": "Have a great day ahead! Remember, small savings everyday make a big difference. 📊"}
]

AFTERNOON_MESSAGES = [
    {"title": "🍽️ Lunch time!", "body": "Bahar khaya ya ghar ka? Don't forget to add your lunch expenses! 🍛"},
    {"title": "☀️ Afternoon Check-in", "body": "Half the day is gone. Are you staying within your daily budget limit? 💸"},
    {"title": "💡 Tip of the day!", "body": "Avoid impulsive purchases today. Think twice before you buy! 🤔"},
    {"title": "🏃 Keep tracking!", "body": "Take a 2-minute break and update your expense tracker. 📝"}
]

EVENING_MESSAGES = [
    {"title": "🌆 Shaam ho gayi!", "body": "Kya aaj kuch savings ki? Check your dashboard and relax. 🛋️"},
    {"title": "🛒 Shopping Check", "body": "Did you go grocery shopping today? Log it to keep your budget updated. 🥬"},
    {"title": "☕ Evening Tea?", "body": "Shaam ki chai aur nashta ka kharcha add kar dijiye! ☕"}
]

NIGHT_MESSAGES = [
    {"title": "🌙 Good Night!", "body": "Sone se pehle aaj ka hisaab kitab zaroor add karein. Sweet dreams! 😴"},
    {"title": "😴 Time to sleep!", "body": "Din bhar ki expenses add kar li? Great! Now get some rest. 🛌"},
    {"title": "💸 Daily Review", "body": "Check your spending for today one last time before you sleep. Good night! 🌠"},
    {"title": "📊 Financial Fitness", "body": "Consistency is key. Log your daily expenses before sleeping! 💪"}
]

WEEKEND_MESSAGES = [
    {"title": "🎉 Weekend Vibes!", "body": "Weekend outings are fun, but don't let them ruin your budget! Log your expenses. 🍿"},
    {"title": "🍕 Weekend Treat?", "body": "Ordered food or went to a movie? Add it to your tracker right away! 🎬"},
    {"title": "📅 Sunday Review", "body": "Weekend is almost over. Time to review your weekly spending! 📈"}
]

MONTH_END_MESSAGES = [
    {"title": "📉 Month is ending!", "body": "Review your monthly expenses to see how much you saved this month! 💰"},
    {"title": "🗓️ Budget Check", "body": "It's almost the end of the month. Did you stick to your budget? Check now! 📊"}
]

MONTH_START_MESSAGES = [
    {"title": "🗓️ New Month, New Goals!", "body": "Happy New Month! Apna naya budget set karein aur savings start karein. 🚀"},
    {"title": "💰 Salary Day?", "body": "If you received your salary, don't forget to allocate your budget for this month! 💸"}
]

def get_message_for_time(scheduled_time):
    day_of_week = scheduled_time.weekday() # 0 = Monday, 6 = Sunday
    day_of_month = scheduled_time.day
    hour = scheduled_time.hour
    
    # 1. Check for Month Start (1st or 2nd)
    if day_of_month in [1, 2] and random.random() < 0.5:
        return random.choice(MONTH_START_MESSAGES)
        
    # 2. Check for Month End (28th to 31st)
    if day_of_month >= 28 and random.random() < 0.5:
        return random.choice(MONTH_END_MESSAGES)
        
    # 3. Check for Weekend (Friday evening, Saturday, Sunday)
    if (day_of_week == 4 and hour >= 17) or day_of_week in [5, 6]:
        if random.random() < 0.4: # 40% chance to get a weekend specific message
            return random.choice(WEEKEND_MESSAGES)
            
    # 4. Fallback to time of day messages
    if hour < 12:
        return random.choice(MORNING_MESSAGES)
    elif hour < 17:
        return random.choice(AFTERNOON_MESSAGES)
    elif hour < 20:
        return random.choice(EVENING_MESSAGES)
    else:
        return random.choice(NIGHT_MESSAGES)

def send_random_push(scheduled_time):
    msg = get_message_for_time(scheduled_time)
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
    print("Daemon started. Smart bot is active!")
    print("Will send context-aware messages exactly at 8 AM and 10 PM every day.")
    while True:
        now = datetime.datetime.now()
        
        # Define the exact times for today
        time1 = now.replace(hour=8, minute=0, second=0, microsecond=0)
        time2 = now.replace(hour=22, minute=0, second=0, microsecond=0)
        
        times_to_fire = []
        if time1 > now:
            times_to_fire.append(time1)
        if time2 > now:
            times_to_fire.append(time2)
            
        # If both times have passed today, schedule for tomorrow
        if not times_to_fire:
            time1 += datetime.timedelta(days=1)
            time2 += datetime.timedelta(days=1)
            times_to_fire = [time1, time2]
            
        print(f"\n--- Next Scheduled Pushes ---")
        for t in times_to_fire:
            print(f"Push scheduled at: {t}")
            
        for t in times_to_fire:
            # Re-evaluate sleep time just in case of drifts
            sleep_seconds = (t - datetime.datetime.now()).total_seconds()
            if sleep_seconds > 0:
                print(f"[{datetime.datetime.now()}] Sleeping until {t} ({int(sleep_seconds)} seconds)...")
                time.sleep(sleep_seconds)
            send_random_push(t)

if __name__ == "__main__":
    try:
        run_daemon()
    except KeyboardInterrupt:
        print("\nDaemon stopped.")
