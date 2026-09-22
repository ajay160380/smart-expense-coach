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
    {"title": "🌅 Good Morning!", "body": "A brand new day begins! Take a quick moment to check your daily budget. 💰"},
    {"title": "☕ Morning Coffee?", "body": "Enjoying your morning tea or coffee? Remember to log your expenses to stay on track! 📝"},
    {"title": "🚀 Wake Up & Win!", "body": "Start your day with clear financial goals. Every mindful decision counts! 💪"},
    {"title": "🌞 Bright Morning!", "body": "Have an amazing day ahead! Remember: small daily savings create lasting wealth. 📊"}
]

AFTERNOON_MESSAGES = [
    {"title": "🍽️ Lunch Break!", "body": "Dined out or ordered in? Don't forget to record your lunch expenses! 🍛"},
    {"title": "☀️ Afternoon Check-in", "body": "Half the day has passed. Are you staying right within your budget target? 💸"},
    {"title": "💡 Smart Money Tip", "body": "Avoid impulse buys today. A 10-second pause before purchasing saves thousands! 🤔"},
    {"title": "🏃 Quick Check-in", "body": "Take 30 seconds to update your expense tracker and keep your finances crystal clear. 📝"}
]

EVENING_MESSAGES = [
    {"title": "🌆 Evening Wind Down", "body": "How did your spending go today? Check your dashboard and relax with peace of mind. 🛋️"},
    {"title": "🛒 Shopping Check", "body": "Picked up groceries or essentials this evening? Log them to keep your budget accurate! 🥬"},
    {"title": "☕ Evening Refreshment", "body": "Enjoying evening snacks or coffee? Add the expense and keep your streak alive! ☕"}
]

NIGHT_MESSAGES = [
    {"title": "🌙 Good Night!", "body": "Review today's expenses one last time before bed. Sleep peacefully and dream big! 😴"},
    {"title": "😴 Time to Rest!", "body": "All expenses logged for the day? Wonderful job! Now get some well-deserved rest. 🛌"},
    {"title": "💸 Daily Wrap-Up", "body": "Take a quick glance at your daily spending before you sleep. Good night! 🌠"},
    {"title": "📊 Financial Fitness", "body": "Consistency is the foundation of wealth. Log your expenses and rest easy tonight! 💪"}
]

WEEKEND_MESSAGES = [
    {"title": "🎉 Weekend Vibes!", "body": "Enjoy your weekend plans while keeping your budget happy by logging as you go! 🍿"},
    {"title": "🍕 Weekend Treat?", "body": "Enjoying a treat or movie with loved ones? Add it to your tracker right away! 🎬"},
    {"title": "📅 Sunday Review", "body": "The weekend is wrapping up. Take 2 minutes to review your weekly spending progress! 📈"}
]

MONTH_END_MESSAGES = [
    {"title": "📉 Month-End Review", "body": "Check your monthly summary to see how much you saved this month! 💰"},
    {"title": "🗓️ Budget Check", "body": "The month is closing. Did you hit your savings goal? Take a look at your report! 📊"}
]

MONTH_START_MESSAGES = [
    {"title": "🗓️ New Month, New Goals!", "body": "Happy new month! Set your fresh budget targets and start strong. 🚀"},
    {"title": "💰 Payday Planning", "body": "Plan your monthly budget today and allocate your savings first! 💸"}
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
