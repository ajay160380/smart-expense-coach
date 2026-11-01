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
            "transfer successful"
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

            // 1. Must contain payment success keywords
            val hasSuccess = SUCCESS_KEYWORDS.any { joinedText.contains(it) }
            if (!hasSuccess) return

            // 2. Extract Amount
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

            // 3. Extract Merchant/Payee
            val merchant = extractMerchantFromTexts(screenTexts, pkgName)

            // 4. Memory deduplication (10-second debounce for same amount on same screen)
            val currentHash = "$pkgName:$extractedAmount:$merchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 10000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.d(TAG, "🎯 Payment Detected from Screen: ₹$extractedAmount at $merchant")

            // 5. Emit event to React Native UI
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
        val pattern = Pattern.compile(
            """(?:paid to|to|sent to)\s+([A-Za-z0-9\s&'.-]+?)(?=\s+on|\s+via|\.|\s*$|\s+using)""",
            Pattern.CASE_INSENSITIVE
        )
        for (t in texts) {
            val m = pattern.matcher(t)
            if (m.find()) {
                val candidate = m.group(1)?.trim() ?: ""
                if (candidate.length in 2..40) {
                    return candidate
                }
            }
        }
        return when (pkg) {
            "com.google.android.apps.nbu.paisa.user" -> "Google Pay Merchant"
            "com.phonepe.app" -> "PhonePe Merchant"
            "net.one97.paytm" -> "Paytm Merchant"
            else -> "UPI Merchant"
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

