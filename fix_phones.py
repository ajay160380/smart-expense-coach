import os
import django
import re

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expense_project.settings")
django.setup()

from tracker.models import UserProfile

for profile in UserProfile.objects.all():
    old = profile.phone_number
    if old:
        new_phone = re.sub(r'[^0-9]', '', old).lstrip("0")
        if old != new_phone:
            profile.phone_number = new_phone
            profile.save()
            print(f"Fixed {old} -> {new_phone}")

print("Done")
