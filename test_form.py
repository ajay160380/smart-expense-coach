from django.contrib.auth.forms import AuthenticationForm
from tracker.models import UserProfile
form = AuthenticationForm(None, data={'username': '7905398965', 'password': 'dummy'})
print('Is valid:', form.is_valid())
print('Errors:', form.errors)

