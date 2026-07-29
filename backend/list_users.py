import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')
django.setup()

from django.contrib.auth.models import User
for u in User.objects.all():
    print(u.username)
