package com.ajay160380.paisamitra.autocapture

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.regex.Pattern

/**
 * Ultra-efficient Accessibility Service for payment success screens.
 * STRICTLY FILTERED by packageNames in payment_accessibility_config.xml.
 * Never called when user is in WhatsApp, YouTube, etc. Zero battery drain.
 */
class PaymentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PaymentAccessibility"

        private val SUCCESS_KEYWORDS = listOf(
            "payment successful",
            "paid successfully",
            "payment of",
            "paid to",
            "transaction successful",
            "money sent",
            "sent successfully",
            "transfer successful",
            "payment completed",
            "payment done",
            "upi transaction id",
            "google transaction id",
            "completed",
            "paid"
        )

        private val REJECT_SCREEN_KEYWORDS = listOf(
            "enter upi pin",
            "enter pin",
            "pay now",
            "request payment",
            "failed",
            "declined",
            "cancelled",
            "retry",
            "split with friends"
        )

        private val AMOUNT_PATTERN = Pattern.compile(
            """(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        // Cache recently captured payments to prevent rapid-fire duplicates on screen animations
        private var lastCapturedHash = ""
        private var lastCapturedTime = 0L
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: return

        try {
            val rootNode = rootInActiveWindow ?: return
            val screenTexts = mutableListOf<String>()
            traverseNode(rootNode, screenTexts)

            if (screenTexts.isEmpty()) return
            val joinedText = screenTexts.joinToString(" ").lowercase()

            // 1. Must NOT be an input/pending screen
            if (REJECT_SCREEN_KEYWORDS.any { joinedText.contains(it) }) {
                return
            }

            // 2. Must contain payment success keywords
            val hasSuccess = SUCCESS_KEYWORDS.any { joinedText.contains(it) }
            if (!hasSuccess) return

            // For Google Pay specifically: must have confirmation of completed payment
            if (pkgName == "com.google.android.apps.nbu.paisa.user") {
                val isGPayConfirmed = joinedText.contains("completed") ||
                                      joinedText.contains("upi transaction id") ||
                                      joinedText.contains("google transaction id") ||
                                      joinedText.contains("paid to") ||
                                      (joinedText.contains("paid") && (joinedText.contains("upi") || joinedText.contains("to")))
                if (!isGPayConfirmed) return
            }

            // 3. Extract Amount
            var extractedAmount = 0.0
            for (text in screenTexts) {
                val matcher = AMOUNT_PATTERN.matcher(text)
                if (matcher.find()) {
                    val rawStr = matcher.group(1)?.replace(",", "") ?: ""
                    val parsed = rawStr.toDoubleOrNull() ?: 0.0
                    if (parsed > 0.0) {
                        extractedAmount = parsed
                        break
                    }
                }
            }

            if (extractedAmount <= 0.0) return

            // 4. Extract Merchant/Payee
            val merchant = extractMerchantFromTexts(screenTexts, pkgName)

            // 5. Memory deduplication (15-second debounce for same amount on same screen)
            val currentHash = "$pkgName:$extractedAmount:$merchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 15000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.d(TAG, "🎯 Payment Detected from Screen: ₹$extractedAmount at $merchant (pkg: $pkgName)")

            // Always persist locally and show system heads-up notification (works even when app is killed)
            AutoCaptureStorage.saveCapturedPayment(applicationContext, extractedAmount, merchant, "screen_detect", pkgName)

            // 6. Emit event to React Native UI if app is foreground/alive
            emitEventToReactNative(applicationContext, "onPaymentScreenDetected", Arguments.createMap().apply {
                putDouble("amount", extractedAmount)
                putString("merchant", merchant)
                putString("source", "screen_detect")
                putString("packageName", pkgName)
                putDouble("timestamp", now.toDouble())
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error in accessibility reader", e)
        }
    }

    private fun traverseNode(node: AccessibilityNodeInfo?, result: MutableList<String>) {
        if (node == null) return
        val text = node.text?.toString()?.trim()
        if (!text.isNullOrEmpty()) {
            result.add(text)
        }
        val desc = node.contentDescription?.toString()?.trim()
        if (!desc.isNullOrEmpty() && desc != text) {
            result.add(desc)
        }
        for (i in 0 until node.childCount) {
            traverseNode(node.getChild(i), result)
        }
    }

    private fun extractMerchantFromTexts(texts: List<String>, pkg: String): String {
        val patterns = listOf(
            Pattern.compile("""(?:paid to|to:|sent to|banking name:?)\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on|\s+via|\.|\s*$|\s+using|\s+upi)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""to\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on|\s+via|\.|\s*$)""", Pattern.CASE_INSENSITIVE)
        )
        for (p in patterns) {
            for (t in texts) {
                val m = p.matcher(t)
                if (m.find()) {
                    val candidate = m.group(1)?.trim() ?: ""
                    if (candidate.length in 2..40 &&
                        !candidate.equals("paid", ignoreCase = true) &&
                        !candidate.equals("completed", ignoreCase = true) &&
                        !candidate.equals("successful", ignoreCase = true)) {
                        return candidate
                    }
                }
            }
        }

        // For Google Pay: if node right before or after amount is a candidate name
        if (pkg == "com.google.android.apps.nbu.paisa.user") {
            for (t in texts) {
                val clean = t.trim()
                if (clean.length in 3..30 &&
                    !clean.contains("₹") &&
                    !clean.contains("rs", ignoreCase = true) &&
                    !clean.equals("paid", ignoreCase = true) &&
                    !clean.equals("completed", ignoreCase = true) &&
                    !clean.contains("upi", ignoreCase = true) &&
                    !clean.contains("transaction", ignoreCase = true) &&
                    !clean.contains("bank", ignoreCase = true)) {
                    return clean
                }
            }
            return "Google Pay"
        }

        return when (pkg) {
            "com.phonepe.app" -> "PhonePe"
            "net.one97.paytm" -> "Paytm"
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
            Log.w(TAG, "Could not emit accessibility event to JS", e)
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility service interrupted")
    }
}
