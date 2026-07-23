import os
import django
from django.conf import settings
import dj_database_url
from django.db import connection

os.environ['DATABASE_URL'] = 'postgresql://postgres.glwfyengmazoxtxabydz:Ajay%401603801221@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'

settings.configure(
    DATABASES={
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=60,
            conn_health_checks=True,
        )
    },
    INSTALLED_APPS=['django.contrib.contenttypes', 'django.contrib.auth']
)

django.setup()

try:
    with connection.cursor() as cur:
        cur.execute("SELECT 1")
        row = cur.fetchone()
        print("SUCCESS! ROW:", row)
except Exception as e:
    print("FAILED TO CONNECT!", e)
