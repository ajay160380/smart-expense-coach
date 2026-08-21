import os
import sys
import django
import requests

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from django.core.cache import cache
from tracker.models import UserProfile
from tracker.views import generate_daily_tip
from datetime import date

def run():
    print("🧹 Clearing Django cache so tips can be generated again...")
    cache.clear()
    
    print("🔍 Fetching linked users...")
    profiles = UserProfile.objects.filter(
        whatsapp_linked=True
    ).exclude(whatsapp_number__isnull=True).exclude(whatsapp_number='')
    
    seen = set()
    for profile in profiles:
        num = profile.phone_number or profile.whatsapp_number
        if not num or num in seen:
            continue
        seen.add(num)
        
        print(f"\n⏳ Generating AI Night Tip for {num}...")
        try:
            msg = generate_daily_tip(profile.user, "night")
            print(f"✅ Generated! Sending to WhatsApp bot...")
            
            # Send to local bot API on port 3001
            r = requests.post("http://127.0.0.1:3001/api/send-message", json={
                "phone_number": num,
                "message": msg
            })
            if r.status_code == 200:
                print(f"🚀 Successfully delivered to {num} via bot API.")
            else:
                print(f"❌ Failed to deliver to {num}: {r.text}")
        except Exception as e:
            print(f"❌ Error for {num}: {e}")

    print("\n🎉 All manual tips sent!")

if __name__ == '__main__':
    run()
