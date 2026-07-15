from tracker.models import UserProfile, User
profiles = UserProfile.objects.filter(phone_number='YOUR_WHATSAPP_NUMBER')
print('Profiles:', profiles)
if profiles.exists():
    print('User username:', profiles.first().user.username)
else:
    users = User.objects.filter(username='ajay')
    print('User by username:', users)
    if users.exists():
        try:
            print('Profile phone:', users.first().profile.phone_number)
        except:
            print('No profile')

