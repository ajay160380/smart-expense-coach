/**
 * PHASE 9.3: NOTIFICATION PARSER FOR UPI & BANK APPS
 * Parses transaction notifications on-device.
 * Filters out OTPs, credits, promotional and failed transactions.
 * Extracts amount and merchant/payee accurately.
 */

// Allow-list of package names (extensible constant)
export const ALLOWED_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user', // Google Pay
  'com.phonepe.app',                        // PhonePe
  'net.one97.paytm',                        // Paytm
  'in.org.npci.upiapp',                     // BHIM
  'com.dreamplug.androidapp',               // CRED
  'com.snapwork.hdfc',                      // HDFC Bank MobileBanking
  'com.sbi.lotusintouch',                   // SBI YONO
  'com.csam.icici.bank.imobile',            // ICICI iMobile
  'com.axis.mobile',                        // Axis Mobile
  'com.msf.kbank.mobile',                   // Kotak Mobile Banking
];

// Exclusion keywords
const OTP_REGEX = /\b(otp|one[-\s]time\s*password|verification\s*code|do\s*not\s*share|secret\s*code)\b/i;
const CREDIT_REGEX = /\b(credited|received|cashback|refund|refunded|deposited|salary)\b/i;
const FAILED_REGEX = /\b(failed|declined|unsuccessful|reversed|cancelled|rejected)\b/i;
const PROMO_REGEX = /\b(cashback\s*of\s*up\s*to|congratulations|flat\s*rs|use\s*code|discount|exclusive\s*deal|win\s*up\s*to)\b/i;

// Regex to capture debit amounts with commas and ₹ / Rs / INR symbols
const AMOUNT_REGEX = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|paid|spent)\s+(?:by\s+)?(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

// Regex to extract merchant/payee
const MERCHANT_REGEX = /(?:to|at|vpa)\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on\b|\s+via\b|\.|\s*$|\s+using\b|\s+ref\b|\s+from\b)/i;

/**
 * Checks if a package is within the allowed payment/bank apps
 */
export function isAllowedPaymentPackage(packageName) {
  if (!packageName) return false;
  return ALLOWED_PACKAGES.includes(packageName.trim().toLowerCase());
}

/**
 * Parses raw notification text on-device.
 * Returns null if the notification is an OTP, credit, promo, failed payment,
 * or if no valid debit amount can be detected.
 */
export function parseNotification(packageName, title = '', text = '', timestamp = null) {
  if (packageName && !isAllowedPaymentPackage(packageName)) {
    return null;
  }

  const combined = `${title || ''} ${text || ''}`.trim();
  if (!combined) return null;

  // 1. Skip OTPs
  if (OTP_REGEX.test(combined)) {
    return null;
  }

  // 2. Skip Credits & Refunds
  if (CREDIT_REGEX.test(combined)) {
    return null;
  }

  // 3. Skip Failed or Reversed transactions
  if (FAILED_REGEX.test(combined)) {
    return null;
  }

  // 4. Skip Promotional banners
  if (PROMO_REGEX.test(combined)) {
    return null;
  }

  // 5. Extract Amount
  const amountMatch = combined.match(AMOUNT_REGEX);
  if (!amountMatch) {
    return null;
  }

  const rawAmountStr = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '').trim();
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // 6. Extract Merchant
  let merchant = 'Payment';
  const merchantMatch = combined.match(MERCHANT_REGEX);
  if (merchantMatch && merchantMatch[1]) {
    const rawMerchant = merchantMatch[1].trim();
    if (rawMerchant.length >= 2 && !/^(the|your|a|an)$/i.test(rawMerchant)) {
      merchant = rawMerchant;
    }
  } else if (title && title.length < 25 && !/google pay|phonepe|paytm|bhim|cred|bank|alert|notice/i.test(title)) {
    merchant = title.trim();
  }

  const finalTimestamp = timestamp || Date.now();
  const source = packageName && /hdfc|sbi|icici|axis|kotak/i.test(packageName) ? 'bank' : 'upi';

  // Client-generated idempotency key (dedupe within 5-minute bucket)
  const timeBucket = Math.floor(finalTimestamp / (5 * 60 * 1000));
  const clientTxnId = `notif_${source}_${Math.round(amount * 100)}_${merchant.toLowerCase().replace(/[^a-z0-9]/g, '')}_${timeBucket}`;

  return {
    amount,
    merchant,
    source,
    timestamp: new Date(finalTimestamp).toISOString(),
    client_txn_id: clientTxnId,
  };
}
