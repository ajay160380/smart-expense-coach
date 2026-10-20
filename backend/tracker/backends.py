from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from .models import UserProfile

class PhoneAuthBackend(ModelBackend):
    """
    Unified Authentication Backend:
    Allows users to log in using their Username, Email address, or Phone number.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('phone_number') or kwargs.get('email')
            
        if not username:
            return None

        identifier = str(username).strip()
        user = None

        # 1. Try standard username (case-insensitive)
        try:
            user = User.objects.get(username__iexact=identifier)
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            pass

        # 2. Try email (case-insensitive, non-empty)
        if not user and '@' in identifier:
            try:
                user = User.objects.filter(email__iexact=identifier).exclude(email='').first()
            except Exception:
                pass

        # 3. Try phone number via UserProfile
        if not user:
            clean_phone = ''.join(c for c in identifier if c.isdigit())
            if len(clean_phone) == 10:
                clean_phone = f"91{clean_phone}"
            try:
                profile = UserProfile.objects.filter(phone_number__in=[identifier, clean_phone]).first()
                if profile:
                    user = profile.user
            except Exception:
                pass

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
