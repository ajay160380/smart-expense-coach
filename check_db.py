import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expense_project.settings")
django.setup()
from tracker.models import UserProfile
for p in UserProfile.objects.all():
    print(repr(p.phone_number))
