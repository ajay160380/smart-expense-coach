from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, Throttled):
            wait = getattr(exc, 'wait', None)
            wait_str = f" Try again in {int(wait)} seconds." if wait else " Please slow down."
            response.data = {
                'error': f'Rate limit exceeded.{wait_str}',
                'detail': str(exc),
                'status_code': 429,
                'retry_after': wait
            }
            if wait:
                response['Retry-After'] = str(int(wait))
        elif isinstance(response.data, dict) and 'detail' in response.data and 'error' not in response.data:
            response.data['error'] = response.data['detail']

    return response
