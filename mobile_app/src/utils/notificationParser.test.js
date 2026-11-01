/**
 * Unit tests for Notification Parser (Phase 9.3)
 * Compatible with node --test and Jest
 */

let describeFn = typeof describe !== 'undefined' ? describe : null;
let testFn = typeof test !== 'undefined' ? test : null;

if (!describeFn) {
  const nodeTest = require('node:test');
  describeFn = nodeTest.describe;
  testFn = nodeTest.it;
}

const assert = require('node:assert');
const { parseNotification, isAllowedPaymentPackage, ALLOWED_PACKAGES } = require('./notificationParser');

describeFn('Notification Parser (Phase 9.3)', () => {
  testFn('validates allowed payment packages', () => {
    assert.strictEqual(isAllowedPaymentPackage('com.google.android.apps.nbu.paisa.user'), true);
    assert.strictEqual(isAllowedPaymentPackage('com.phonepe.app'), true);
    assert.strictEqual(isAllowedPaymentPackage('com.whatsapp'), false);
  });

  testFn('parses Google Pay debit notification with Rupee symbol and commas', () => {
    const parsed = parseNotification(
      'com.google.android.apps.nbu.paisa.user',
      'Google Pay',
      'Paid ₹1,250.50 to Starbucks Coffee'
    );
    assert.notStrictEqual(parsed, null);
    assert.strictEqual(parsed.amount, 1250.5);
    assert.strictEqual(parsed.merchant, 'Starbucks Coffee');
    assert.strictEqual(parsed.source, 'upi');
    assert.ok(parsed.client_txn_id);
  });

  testFn('parses PhonePe debit with Rs format', () => {
    const parsed = parseNotification(
      'com.phonepe.app',
      'Payment Successful',
      'Paid Rs 400 to Zepto via UPI'
    );
    assert.notStrictEqual(parsed, null);
    assert.strictEqual(parsed.amount, 400);
    assert.strictEqual(parsed.merchant, 'Zepto');
  });

  testFn('parses Bank debit notification', () => {
    const parsed = parseNotification(
      'com.snapwork.hdfc',
      'HDFC Bank Alert',
      'Your account debited by INR 3,499.00 at Amazon India on 15-Nov'
    );
    assert.notStrictEqual(parsed, null);
    assert.strictEqual(parsed.amount, 3499.0);
    assert.strictEqual(parsed.merchant, 'Amazon India');
    assert.strictEqual(parsed.source, 'bank');
  });

  testFn('skips OTP messages', () => {
    const parsed = parseNotification(
      'com.snapwork.hdfc',
      'HDFC Bank OTP',
      'Your OTP for transaction of Rs 500 is 948210. Do not share with anyone.'
    );
    assert.strictEqual(parsed, null);
  });

  testFn('skips Credits and Refunds', () => {
    const parsed1 = parseNotification(
      'com.phonepe.app',
      'Money Received',
      'Received ₹500 from Rohit Sharma via UPI'
    );
    assert.strictEqual(parsed1, null);

    const parsed2 = parseNotification(
      'net.one97.paytm',
      'Cashback Received',
      'Cashback of Rs 25 credited to your account'
    );
    assert.strictEqual(parsed2, null);
  });

  testFn('skips Failed and Reversed transactions', () => {
    const parsed = parseNotification(
      'com.google.android.apps.nbu.paisa.user',
      'Payment Failed',
      'Payment of ₹350 to Swiggy failed. Any debited amount will be reversed.'
    );
    assert.strictEqual(parsed, null);
  });

  testFn('skips Promotional messages', () => {
    const parsed = parseNotification(
      'com.phonepe.app',
      'Special Offer',
      'Congratulations! Win cashback of up to Rs 200 on recharge.'
    );
    assert.strictEqual(parsed, null);
  });
});
