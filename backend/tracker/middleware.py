from django.http import HttpResponseRedirect
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser

class APKDownloadRedirectMiddleware:
    """
    Ensures that any request to /static/downloads/ExpenseTracker.apk,
    /downloads/ExpenseTracker.apk, or /download-apk/ is immediately
    redirected to the latest Expo CDN build URL BEFORE WhiteNoise serves
    a potentially stale or memory-heavy 120MB static file on Render free-tier.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path in (
            '/static/downloads/ExpenseTracker.apk',
            '/downloads/ExpenseTracker.apk',
            '/static/downloads/ExpenseTracker.apk/',
            '/downloads/ExpenseTracker.apk/',
        ):
            from tracker.views import get_apk_response
            return get_apk_response()

        return self.get_response(request)


class TokenAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only attempt to authenticate via Token header if session authentication hasn't resolved a user
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if auth_header and (not hasattr(request, 'user') or not request.user.is_authenticated):
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ('token', 'bearer'):
                token_key = parts[1]
                from tracker.authentication import validate_and_touch_token
                user, token = validate_and_touch_token(token_key)
                if user and user.is_active:
                    request.user = user
        return self.get_response(request)
