import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "expense_project.settings")
django.setup()

from tracker.models import UserProfile
from django.db.models import Q
import re

token = "917860600850"
incoming_phone = "917860600850"

normalized_token = re.sub(r'[^0-9]', '', token).lstrip("0")
normalized_incoming = re.sub(r'[^0-9]', '', incoming_phone).lstrip("0")

print(f"Norm token: {normalized_token}, Norm incoming: {normalized_incoming}")

if normalized_token != normalized_incoming:
    print("MISMATCH")
else:
    print("MATCH")

if normalized_token.startswith("91") and len(normalized_token) > 10:
    token_without_cc = normalized_token[2:]
    token_with_cc = normalized_token
else:
    token_without_cc = normalized_token
    token_with_cc = "91" + normalized_token

print(f"Search for: {token_with_cc} or {token_without_cc}")

profile = UserProfile.objects.filter(
    Q(phone_number=token_with_cc) | Q(phone_number=token_without_cc)
).first()

if profile:
    print(f"FOUND PROFILE: {profile.user.username} with {profile.phone_number}")
else:
    print("NOT FOUND")
