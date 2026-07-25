import firebase_admin
from firebase_admin import credentials, messaging

# Initialize using the local JSON file
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)

# Create a funny test message targeting the 'all_users' topic
message = messaging.Message(
    notification=messaging.Notification(
        title='Bhai, Kidney bechne ka irada hai kya? 🏥💸',
        body='Tera wallet ro raha hai! Thoda hath rok le warna agli EMI bharne ke liye Paisa Mitra bhi madad nahi kar paayega! 😂💳',
    ),
    topic='all_users',
)

try:
    response = messaging.send(message)
    print('Successfully sent message:', response)
except Exception as e:
    print('Error sending message:', e)
