import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Payment Regexes to detect amount and merchant
// Examples:
// "Paid ₹150 to Swiggy"
// "Payment of ₹150 to Swiggy successful"
// "₹150 paid to Swiggy"
const paymentRegexes = [
  /paid\s*₹?\s*(\d+(?:\.\d+)?)\s*to\s*(.+)/i,
  /payment\s*of\s*₹?\s*(\d+(?:\.\d+)?)\s*to\s*(.+)\s*successful/i,
  /₹?\s*(\d+(?:\.\d+)?)\s*paid\s*to\s*(.+)/i
];

const TARGET_APPS = [
  'com.phonepe.app',
  'com.google.android.apps.nbu.paisa.user', // GPay
  'net.one97.paytm',
  'com.mobikwik_new',
  'com.freecharge.android',
  'in.amazon.mShop.android.shopping' // Amazon Pay
];

export const headlessNotificationListener = async ({ notification }) => {
  try {
    if (!notification) return;
    
    // Parse the JSON string
    const data = typeof notification === 'string' ? JSON.parse(notification) : notification;
    
    const app = data.app || '';
    const text = data.text || '';
    const title = data.title || '';
    
    const fullText = `${title} ${text}`;
    
    // Check if the notification is from a payment app
    if (!TARGET_APPS.includes(app)) {
      return;
    }
    
    // Try to match payment patterns
    let amount = null;
    let merchant = null;
    
    for (const regex of paymentRegexes) {
      const match = fullText.match(regex);
      if (match && match.length >= 3) {
        amount = match[1];
        merchant = match[2].trim();
        break;
      }
    }
    
    if (amount && merchant) {
      // Save it temporarily so we can pre-fill the Add Expense screen if they tap it
      await AsyncStorage.setItem('pending_expense_amount', amount);
      await AsyncStorage.setItem('pending_expense_merchant', merchant);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💡 Paisa Mitra: Payment Detected!',
          body: `You just spent ₹${amount} at ${merchant}. Tap to save it in Food or Shopping!`,
          data: { amount, merchant, action: 'add_expense' },
          sound: true,
        },
        trigger: null, // Send immediately
      });
      
      console.log(`Payment detected: ₹${amount} to ${merchant}`);
    }
  } catch (error) {
    console.error('Error in headlessNotificationListener:', error);
  }
};
