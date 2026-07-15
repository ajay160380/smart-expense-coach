from tracker.models import UserProfile
for p in UserProfile.objects.all():
    print(f'User: {p.user.username}, Phone: {p.phone_number}')

