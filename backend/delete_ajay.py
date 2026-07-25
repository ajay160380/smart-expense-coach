import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from tracker.models import UserProfile

# Find profiles matching "Ajay" or "ajay"
profiles = UserProfile.objects.filter(name__icontains='ajay')

if profiles.exists():
    for profile in profiles:
        print(f"Found profile: {profile.name} (Phone: {profile.phone_number})")
        # Deleting profile
        profile.delete()
        print("✅ Profile deleted successfully!")
else:
    print("❌ No profile found with name containing 'Ajay'")
