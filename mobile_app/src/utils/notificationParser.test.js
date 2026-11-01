/**
 * Unit tests for Notification Parser
 */

const { parseNotification, isAllowedPaymentPackage, ALLOWED_PACKAGES } = require('./notificationParser');

describe('Notification Parser (Phase 9.3)', () => {
  test('validates allowed payment packages', () => {
    expect(isAllowedPaymentPackage('com.google.android.apps.nbu.paisa.user')).toBe(true);
    expect(isAllowedPaymentPackage('com.phonepe.app')).toBe(true);
    expect(isAllowedPaymentPackage('com.whatsapp')).toBe(false);
  });

  test('parses Google Pay debit notification with Rupee symbol and commas', () => {
    const parsed = parseNotification(
      'com.google.android.apps.nbu.paisa.user',
      'Google Pay',
      'Paid ₹1,250.50 to Starbucks Coffee'
    );
    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(1250.5);
    expect(parsed.merchant).toBe('Starbucks Coffee');
    expect(parsed.source).toBe('upi');
    expect(parsed.client_txn_id).toBeDefined();
  });

  test('parses PhonePe debit with Rs format', () => {
    const parsed = parseNotification(
      'com.phonepe.app',
      'Payment Successful',
      'Paid Rs 400 to Zepto via UPI'
    );
    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(400);
    expect(parsed.merchant).toBe('Zepto');
  });

  test('parses Bank debit notification', () => {
    const parsed = parseNotification(
      'com.snapwork.hdfc',
      'HDFC Bank Alert',
      'Your account debited by INR 3,499.00 at Amazon India on 15-Nov'
    );
    expect(parsed).not.toBeNull();
    expect(parsed.amount).toBe(3499.0);
    expect(parsed.merchant).toBe('Amazon India');
    expect(parsed.source).toBe('bank');
  });

  test('skips OTP messages', () => {
    const parsed = parseNotification(
      'com.snapwork.hdfc',
      'HDFC Bank OTP',
      'Your OTP for transaction of Rs 500 is 948210. Do not share with anyone.'
    );
    expect(parsed).toBeNull();
  });

  test('skips Credits and Refunds', () => {
    const parsed1 = parseNotification(
      'com.phonepe.app',
      'Money Received',
      'Received ₹500 from Rohit Sharma via UPI'
    );
    expect(parsed1).toBeNull();

    const parsed2 = parseNotification(
      'net.one97.paytm',
      'Cashback Received',
      'Cashback of Rs 25 credited to your account'
    );
    expect(parsed2).toBeNull();
  });

  test('skips Failed and Reversed transactions', () => {
    const parsed = parseNotification(
      'com.google.android.apps.nbu.paisa.user',
      'Payment Failed',
      'Payment of ₹350 to Swiggy failed. Any debited amount will be reversed.'
    );
    expect(parsed).toBeNull();
  });

  test('skips Promotional messages', () => {
    const parsed = parseNotification(
      'com.phonepe.app',
      'Special Offer',
      'Congratulations! Win cashback of up to Rs 200 on recharge.'
    );
    expect(parsed).toBeNull();
  });
});
