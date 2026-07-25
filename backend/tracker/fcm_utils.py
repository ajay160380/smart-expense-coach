import firebase_admin
from firebase_admin import credentials, messaging
import os
from django.conf import settings

# Initialize Firebase app only once
def initialize_firebase():
    if not firebase_admin._apps:
        # We copied this from your downloads folder earlier
        cred_path = os.path.join(settings.BASE_DIR, 'firebase-service-account.json')
        
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin initialized successfully.")
        except Exception as e:
            print("Warning: Could not initialize Firebase Admin.", e)

def send_push_notification(fcm_token, title, body, data=None):
    """
    Send a push notification to a specific device token.
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
        )

        # Send the message
        response = messaging.send(message)
        print('Successfully sent message:', response)
        return True
        
    except Exception as e:
        print('Error sending message:', e)
        return False
