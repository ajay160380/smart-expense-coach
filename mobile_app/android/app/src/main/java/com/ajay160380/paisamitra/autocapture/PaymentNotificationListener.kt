package com.ajay160380.paisamitra.autocapture

import android.content.Context
import android.content.Intent
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
 * Wakes up ONLY when an allow-listed payment app issues a notification.
 * Zero polling, 0% idle battery consumption.
 */
class PaymentNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "PaymentNotifListener"

        val ALLOWED_PACKAGES = setOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe
            "net.one97.paytm",                       // Paytm
            "in.org.npci.upiapp",                    // BHIM
            "com.snapwork.hdfc",                     // HDFC
            "com.sbi.upi",                           // SBI YONO / Pay
            "com.csam.icici.bank.imobile",           // ICICI iMobile
            "com.axis.mobile",                       // Axis Mobile
            "com.msf.kopl",                          // Kotak 811
            "com.dreamplug.androidapp"               // CRED
        )

        private val AMOUNT_PATTERN = Pattern.compile(
            """(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        private val REJECT_PATTERNS = listOf(
            Pattern.compile("""\botp\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\bcredited\b|\breceived\b|\bcashback\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\bfailed\b|\breversed\b|\bdeclined\b""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""\boffer\b|\bdiscount\b|\bwin\b""", Pattern.CASE_INSENSITIVE)
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val pkgName = sbn.packageName ?: return
        if (!ALLOWED_PACKAGES.contains(pkgName)) {
            // Immediate return: Zero CPU usage for non-payment apps
            return
        }

        try {
            val extras = sbn.notification.extras ?: return
            val title = extras.getString("android.title") ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""
            val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
            val fullContent = "$title $text $bigText".trim()

            if (fullContent.isEmpty()) return

            // 1. Skip OTPs, credits, cashbacks, failed transactions
            for (pattern in REJECT_PATTERNS) {
                if (pattern.matcher(fullContent).find()) {
                    return
                }
            }

            // 2. Extract amount
            val amountMatcher = AMOUNT_PATTERN.matcher(fullContent)
            if (!amountMatcher.find()) return

            val rawAmountStr = amountMatcher.group(1)?.replace(",", "") ?: return
            val amount = rawAmountStr.toDoubleOrNull() ?: return
            if (amount <= 0.0) return

            // 3. Extract merchant
            var merchant = extractMerchant(fullContent)
            if (merchant.isEmpty()) {
                merchant = getAppName(pkgName)
            }

            Log.d(TAG, "⚡ Payment Captured from Notification: ₹$amount at $merchant")

            // 4. Emit to React Native JavaScript layer
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
            Pattern.compile("""(?:paid to|to|at)\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on|\s+via|\.|\s*$|\s+using)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""sent to\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on|\s+via|\.|\s*$)""", Pattern.CASE_INSENSITIVE)
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
        return when (pkg) {
            "com.google.android.apps.nbu.paisa.user" -> "Google Pay"
            "com.phonepe.app" -> "PhonePe"
            "net.one97.paytm" -> "Paytm"
            "in.org.npci.upiapp" -> "BHIM UPI"
            "com.snapwork.hdfc" -> "HDFC Bank"
            "com.sbi.upi" -> "SBI Bank"
            "com.csam.icici.bank.imobile" -> "ICICI Bank"
            "com.axis.mobile" -> "Axis Bank"
            "com.dreamplug.androidapp" -> "CRED"
            else -> "UPI Payment"
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
            Log.w(TAG, "Could not emit to JS context (app may be backgrounded)", e)
        }
    }
}
