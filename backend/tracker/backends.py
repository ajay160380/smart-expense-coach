from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from .models import UserProfile

class PhoneAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # 'username' parameter might actually contain the phone number or the real username
        if username is None:
            username = kwargs.get('phone_number')
            
        if username and len(str(username)) == 10 and str(username).isdigit():
            username = f"91{username}"
        try:
            # First try standard username
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            try:
                # Then try phone number via UserProfile
                # Note: clean formatting if necessary, but we can assume exact match for now
                profile = UserProfile.objects.get(phone_number=username)
                user = profile.user
            except UserProfile.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
