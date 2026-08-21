import os
import sys
import django

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.join(os.getcwd(), 'backend'))
django.setup()

from tracker.views import _groq_client

prompt = "Hello, generate a short message."
try:
    r = _groq_client().chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
        temperature=0.9,
        max_tokens=1000,
    )
    print("RESPONSE CONTENT:")
    print(repr(r.choices[0].message.content))
except Exception as e:
    print("ERROR:", str(e))
