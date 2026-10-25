import firebase_admin
from firebase_admin import credentials, messaging
import os
from django.conf import settings

import json

# Initialize Firebase app only once
def initialize_firebase():
    if not firebase_admin._apps:
        try:
            # First try loading from Environment Variable (for Hugging Face)
            env_cred = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
            if env_cred:
                cred_dict = json.loads(env_cred)
                cred = credentials.Certificate(cred_dict)
                print("Firebase Admin initialized from Environment Variable.")
            else:
                # Fallback to local file for development
                cred_path = os.path.join(settings.BASE_DIR, 'firebase-service-account.json')
                cred = credentials.Certificate(cred_path)
                print("Firebase Admin initialized from local file.")
                
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print("Warning: Could not initialize Firebase Admin.", e)

def get_android_config(title, body, channel_id='expense_tracker_alerts_v2'):
    return messaging.AndroidConfig(
        priority='high',
        notification=messaging.AndroidNotification(
            title=title,
            body=body,
            sound='default',
            channel_id=channel_id,
            priority='max',
            default_sound=True,
            default_vibrate_timings=True,
            visibility='public',
        ),
    )

def get_apns_config(title, body):
    return messaging.APNSConfig(
        headers={'apns-priority': '10'},
        payload=messaging.APNSPayload(
            aps=messaging.Aps(
                alert=messaging.ApsAlert(title=title, body=body),
                sound='default',
                badge=1,
            )
        ),
    )

def send_push_notification(fcm_token, title, body, data=None):
    """
    Send a push notification to a specific device token with high priority, sound, and popup channel.
    """
    initialize_firebase()
    
    if not fcm_token:
        print("No FCM token provided")
        return False
        
    try:
        # Create the message
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data if data else {},
            token=fcm_token,
            android=get_android_config(title, body),
            apns=get_apns_config(title, body)
        )

        # Send the message
        response = messaging.send(message)
        print('Successfully sent message:', response)
        return True
        
    except Exception as e:
        print('Error sending message:', e)
        return False
