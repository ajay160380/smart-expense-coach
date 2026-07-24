from rest_framework.authtoken.models import Token
from django.contrib.auth.models import AnonymousUser

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
                try:
                    token = Token.objects.select_related('user').get(key=token_key)
                    request.user = token.user
                except Token.DoesNotExist:
                    pass
        return self.get_response(request)
