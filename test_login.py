from django.contrib.auth import authenticate
user = authenticate(username='YOUR_PHONE_NUMBER', password='YOUR_NEW_PASSWORD')
print('Authenticated User:', user)

