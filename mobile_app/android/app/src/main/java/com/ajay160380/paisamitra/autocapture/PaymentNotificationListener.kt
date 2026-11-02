package com.ajay160380.paisamitra.autocapture

import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.regex.Pattern

/**
 * Ultra-lightweight Silent Notification Listener.
 * Wakes up ONLY when an allow-listed payment app issues a verified debit notification.
 * Zero polling, 0% idle battery consumption.
 */
class PaymentNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotifListener"

        val ALLOWED_PACKAGES = setOf(
            // Top UPI Apps
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe
            "net.one97.paytm",                       // Paytm
            "in.org.npci.upiapp",                    // BHIM
            "com.dreamplug.androidapp",              // CRED
            "in.amazon.mShop.android.shopping",      // Amazon Pay
            "com.whatsapp",                          // WhatsApp Pay
            "com.mobikwik_new",                      // MobiKwik
            "com.freecharge.android",                // Freecharge
            "com.naviapp",                           // Navi
            "com.fivehundredrishabh.slice",          // Slice
            "money.jupiter",                         // Jupiter
            "money.fi",                              // Fi Money
            "com.bharatpe.postpe",                   // PostPe
            "com.bajajfinserv.direct",               // Bajaj Finserv

            // Major Public Sector Banks
            "com.sbi.upi",                           // SBI YONO / Pay
            "com.sbi.lotusintouch",                  // YONO SBI
            "com.bankofbaroda.mconnect",             // bob World (Bank of Baroda)
            "com.pnb.mb",                            // PNB ONE
            "com.canarabank.mobility",               // Canara ai1
            "com.infrasofttech.uboi",                // Union Bank (Vyom)
            "com.infrasofttech.indianbankmbs",       // IndOASIS (Indian Bank)
            "com.boi.mobile",                        // BOI Mobile
            "com.cbi.mobile",                        // Cent Mobile
            "com.iob.mconnect",                      // IOB Mobile
            "com.uco.ucobank",                       // UCO Bank

            // Major Private Sector Banks
            "com.snapwork.hdfc",                     // HDFC Bank
            "com.hdfcbank.payzapp",                  // PayZapp
            "com.csam.icici.bank.imobile",           // ICICI iMobile
            "com.axis.mobile",                       // Axis Mobile
            "com.msf.kopl",                          // Kotak (legacy)
            "com.kotak811mobilebankingapp.instantsavingsupiscanandpayrecharge", // Kotak 811
            "com.idfcfirstbank.optimus",             // IDFC FIRST Bank
            "com.indusind.mpassbook",                // IndusInd Bank
            "com.yesbank",                           // YES Bank
            "com.fedmobile",                         // Federal Bank
            "com.rblbank.mobank",                    // RBL MoBank
            "com.bandhan.mBandhan",                  // Bandhan Bank
            "com.aubank.aubankapp",                  // AU Small Finance Bank
            "com.equitasbank.equitasmobile",         // Equitas Small Finance Bank
            "com.idbi.idbimbank",                    // IDBI Bank

            // Payments Banks
            "com.myairtelapp",                       // Airtel Thanks / Payments Bank
            "com.jio.myjio",                         // MyJio / Jio Payments
            "com.ippb.mbanking",                     // IPPB (India Post)

            // Universal Bank SMS Messaging Apps
            "com.google.android.apps.messaging",     // Google Messages
            "com.android.mms",                       // Android Default SMS (Oppo / ColorOS / Samsung)
            "com.coloros.mms",                       // Oppo / Realme ColorOS SMS
            "com.samsung.android.messaging",         // Samsung Messages
            "com.xiaomi.mms",                        // Xiaomi MIUI SMS
            "com.vivo.mms",                          // Vivo Funtouch SMS
            "com.oneplus.mms"                        // OnePlus OxygenOS SMS
        )

        private val AMOUNT_PATTERN = Pattern.compile(
            """(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        // Strict positive debit indicators — required for ALL apps to prevent capturing ads/offers
        private val DEBIT_KEYWORDS = listOf(
            "debited",
            "debit",
            "sent to",
            "paid to",
            "spent",
            "transferred to",
            "transfer to",
            "withdrawn",
            "paid rs",
            "sent rs",
            "paid inr",
            "sent inr",
            "paid ₹",
            "sent ₹",
            "payment of",
            "payment to",
            "payment successful",
            "auto-debited",
            "deducted",
            "successful payment",
            "txn of rs",
            "transaction of rs"
        )

        // Strict reject patterns — filters out loan offers, credit alerts, recharge ads, OTPs, bill reminders
        private val REJECT_PATTERNS = listOf(
            Pattern.compile("""\b(?:otp|one time password|code|verification)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:credited|credit alert|has been credited|is credited|received from|credited to|credited with|deposited)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:failed|declined|unsuccessful|cancelled|expired|reversed|rejected)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:loan|pre-approved|apply now|instant loan|credit limit|card offer|avail)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:recharge now|recharge for|invest|mutual fund|sip|fixed deposit|fd|insurance|policy)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:due on|bill due|due date|pay before|reminder|outstanding|upcoming)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:requested|request from|request to pay|mandate request)\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\b(?:save up to|upto|flat\s+(?:rs\.?|inr|₹)|discount|cashback offer|coupon|voucher|win|won|jackpot|bonus|rewards)\b""", Pattern.CASE_INSENSITIVE)
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return

        try {
            val extras = sbn.notification.extras ?: return
            val title = extras.getString("android.title") ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""
            val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
            val fullContent = "$title $text $bigText".trim()

            if (fullContent.isEmpty()) return

            // Check if this package is a bank, payment app, or bank debit SMS
            val isKnown = ALLOWED_PACKAGES.contains(pkgName.lowercase())
            val isFinApp = pkgName.contains("bank", ignoreCase = true) ||
                           pkgName.contains("upi", ignoreCase = true) ||
                           pkgName.contains("wallet", ignoreCase = true) ||
                           pkgName.contains("pay", ignoreCase = true)
            val isSMS = pkgName.contains("messaging", ignoreCase = true) ||
                        pkgName.contains("mms", ignoreCase = true) ||
                        pkgName.contains("sms", ignoreCase = true)

            if (!isKnown && !isFinApp && !isSMS) {
                return
            }

            val lowerContent = fullContent.lowercase()

            // 1. MUST contain an explicit DEBIT keyword (rejects all general ads, offers, updates)
            val isDebit = DEBIT_KEYWORDS.any { lowerContent.contains(it) }
            if (!isDebit) {
                return
            }

            // 2. Reject OTPs, credits, failed transactions, loans, recharge ads, coupons
            for (pattern in REJECT_PATTERNS) {
                if (pattern.matcher(fullContent).find()) {
                    return
                }
            }

            // 3. Extract amount
            val amountMatcher = AMOUNT_PATTERN.matcher(fullContent)
            if (!amountMatcher.find()) return

            val rawAmountStr = amountMatcher.group(1)?.replace(",", "") ?: return
            val amount = rawAmountStr.toDoubleOrNull() ?: return
            if (amount <= 0.0) return

            // 4. Extract merchant
            var merchant = extractMerchant(fullContent)
            if (merchant.isEmpty()) {
                merchant = getAppName(pkgName)
            }

            Log.d(TAG, "⚡ Verified Debit Captured from Notification: ₹$amount at $merchant (pkg: $pkgName)")

            // Always persist locally, sync directly in background, and show heads-up alert
            AutoCaptureStorage.saveCapturedPayment(applicationContext, amount, merchant, "notification", pkgName)

            // Emit to React Native JavaScript layer if app is foreground/alive
            emitEventToReactNative(applicationContext, "onPaymentCaptured", Arguments.createMap().apply {
                putDouble("amount", amount)
                putString("merchant", merchant)
                putString("source", "notification")
                putString("packageName", pkgName)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error parsing notification", e)
        }
    }

    private fun extractMerchant(text: String): String {
        val patterns = listOf(
            Pattern.compile("""(?:paid to|to|at)\s+([A-Za-z0-9\s&'.-]+?)(?=\s+Amount|\s+from|\s+on|\s+via|\.|\s*$|\s+using)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""sent to\s+([A-Za-z0-9\s&'.-]+?)(?=\s+Amount|\s+from|\s+on|\s+via|\.|\s*$)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""transferred to\s+([A-Za-z0-9\s&'.-]+?)(?=\s+Amount|\s+from|\s+on|\s+via|\.|\s*$)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""Info:\s*UPI/[^/]+/([^/]+)""", Pattern.CASE_INSENSITIVE)
        )
        for (p in patterns) {
            val m = p.matcher(text)
            if (m.find()) {
                val candidate = m.group(1)?.trim() ?: ""
                if (candidate.length in 2..40) {
                    return candidate
                }
            }
        }
        return ""
    }

    private fun getAppName(pkg: String): String {
        val lower = pkg.lowercase()
        return when {
            lower.contains("kotak") -> "Kotak Bank"
            lower.contains("sbi") -> "State Bank of India"
            lower.contains("hdfc") -> "HDFC Bank"
            lower.contains("icici") -> "ICICI Bank"
            lower.contains("axis") -> "Axis Bank"
            lower.contains("baroda") -> "Bank of Baroda"
            lower.contains("pnb") -> "PNB Bank"
            lower.contains("canara") -> "Canara Bank"
            lower.contains("uboi") || lower.contains("union") -> "Union Bank"
            lower.contains("indianbank") -> "Indian Bank"
            lower.contains("idfc") -> "IDFC FIRST Bank"
            lower.contains("indusind") -> "IndusInd Bank"
            lower.contains("yesbank") -> "YES Bank"
            lower.contains("fedmobile") || lower.contains("federal") -> "Federal Bank"
            lower.contains("rbl") -> "RBL Bank"
            lower.contains("bandhan") -> "Bandhan Bank"
            lower.contains("aubank") -> "AU Bank"
            lower.contains("paisa") -> "Google Pay"
            lower.contains("phonepe") -> "PhonePe"
            lower.contains("paytm") -> "Paytm"
            lower.contains("upiapp") -> "BHIM UPI"
            lower.contains("dreamplug") -> "CRED"
            lower.contains("jupiter") -> "Jupiter"
            lower.contains("fi") -> "Fi Money"
            lower.contains("slice") -> "Slice"
            lower.contains("navi") -> "Navi"
            lower.contains("messaging") || lower.contains("mms") || lower.contains("sms") -> "Bank SMS"
            else -> "Bank / UPI"
        }
    }

    private fun emitEventToReactNative(context: Context, eventName: String, params: Any?) {
        try {
            val reactApp = context.applicationContext as? ReactApplication ?: return
            val reactInstanceManager = reactApp.reactNativeHost.reactInstanceManager
            val reactContext = reactInstanceManager.currentReactContext ?: return
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.w(TAG, "Could not emit to JS context", e)
        }
    }
}
