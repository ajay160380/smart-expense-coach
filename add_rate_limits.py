import re

path = 'backend/tracker/views.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Ensure django_ratelimit is imported
if 'from django_ratelimit.decorators import ratelimit' not in content:
    content = content.replace('from django.shortcuts import render', 'from django.shortcuts import render\nfrom django_ratelimit.decorators import ratelimit')

# 1. user_login
if '@ratelimit(key=\'ip\', rate=\'5/m\', block=True)' not in content and 'def user_login(' in content:
    content = content.replace('def user_login(', '@ratelimit(key=\'ip\', rate=\'5/m\', block=True)\ndef user_login(')

# 2. register
if '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)' not in content and 'def register(' in content:
    content = content.replace('def register(', '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)\ndef register(')

# 3. api_send_otp
if '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)' not in content and 'def api_send_otp(' in content:
    content = content.replace('def api_send_otp(', '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)\ndef api_send_otp(')

# 4. api_reset_password
if '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)' not in content and 'def api_reset_password(' in content:
    content = content.replace('def api_reset_password(', '@ratelimit(key=\'ip\', rate=\'3/m\', block=True)\ndef api_reset_password(')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Rate limiting decorators applied.")
