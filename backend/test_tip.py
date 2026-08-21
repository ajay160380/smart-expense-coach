import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from tracker.models import UserProfile
from tracker.views import generate_daily_tip

def test():
    profile = UserProfile.objects.first()
    if profile:
        print("User:", profile.user.username)
        try:
            tip = generate_daily_tip(profile.user, "night")
            print("--- TIP ---")
            print(repr(tip))
            print("-----------")
        except Exception as e:
            print("ERROR:", e)

if __name__ == '__main__':
    test()
