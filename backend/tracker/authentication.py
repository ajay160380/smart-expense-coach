"""
Expiring Token Authentication and Token Inactivity Management.
Implements a 30-day inactivity timeout with a grace period for pre-existing tokens.
"""

from datetime import datetime, timedelta
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.models import Token

# Baseline deployment date: Existing tokens created before this date start their 30-day count from here
TOKEN_BASELINE_DATE = getattr(settings, 'TOKEN_DEPLOYMENT_BASELINE', timezone.now())
TOKEN_INACTIVITY_LIMIT_DAYS = 30


def get_token_last_used(token: Token) -> datetime:
    """Retrieve last used timestamp for token, respecting deployment baseline for existing tokens."""
    cache_key = f"token_last_used_{token.key}"
    last_used = cache.get(cache_key)
    if last_used:
        return last_used

    # Check user profile if available
    profile = getattr(token.user, 'profile', None)
    if profile and getattr(profile, 'last_token_activity', None):
        return profile.last_token_activity

    # For existing tokens with no recorded activity, start counting from baseline deployment date
    token_created = token.created
    if token_created < TOKEN_BASELINE_DATE:
        return TOKEN_BASELINE_DATE
    return token_created


def touch_token_activity(token: Token):
    """Update last used timestamp in cache."""
    now = timezone.now()
    cache_key = f"token_last_used_{token.key}"
    cache.set(cache_key, now, timeout=86400 * TOKEN_INACTIVITY_LIMIT_DAYS)


def validate_and_touch_token(token_key: str):
    """
    Validates token existence and 30-day inactivity expiry.
    Returns: (user, token) on success, or (None, 'expired') if expired, or (None, None).
    """
    try:
        token = Token.objects.select_related('user').get(key=token_key)
    except Token.DoesNotExist:
        return None, None

    last_used = get_token_last_used(token)
    if timezone.now() - last_used > timedelta(days=TOKEN_INACTIVITY_LIMIT_DAYS):
        token.delete()
        cache.delete(f"token_last_used_{token_key}")
        return None, "expired"

    touch_token_activity(token)
    return token.user, token


class ExpiringTokenAuthentication(TokenAuthentication):
    """
    DRF Authentication class that rejects tokens unused for more than 30 days.
    """
    def authenticate_credentials(self, key):
        user, result = validate_and_touch_token(key)
        if result == "expired":
            raise AuthenticationFailed('Token has expired after 30 days of inactivity. Please log in again.')
        if not user or not user.is_active:
            raise AuthenticationFailed('Invalid or inactive user token.')
        return (user, result)
