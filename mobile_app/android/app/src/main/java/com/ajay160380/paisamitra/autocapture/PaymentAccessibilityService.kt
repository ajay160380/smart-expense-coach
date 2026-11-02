package com.ajay160380.paisamitra.autocapture

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Calendar
import java.util.Locale
import java.util.regex.Pattern

/**
 * Intelligent Accessibility Service for UPI & Bank Payment Screens.
 * Accurately captures real-time payments from Google Pay, PhonePe, Paytm, Navi, and Banks.
 * Strictly ignores chat scrolling, old chat history, and incoming money.
 */
class PaymentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PaymentAccessibility"

        // Explicit confirmation indicators on dedicated receipt screens
        private val RECEIPT_CONFIRM_KEYWORDS = listOf(
            "payment successful",
            "paid successfully",
            "transfer successful",
            "payment completed",
            "transaction successful",
            "successful payment",
            "money sent successfully",
            "upi transaction id",
            "google transaction id",
            "utr",
            "upi ref",
            "reference no"
        )

        private val REJECT_INPUT_KEYWORDS = listOf(
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

        // Patterns to match outgoing GPay chat bubble: "Payment to AJAY"
        private val GPAY_OUTGOING_BUBBLE_PATTERN = Pattern.compile(
            """(?:Payment to|Paid to)\s+([A-Za-z0-9\s&'.-]+)""",
            Pattern.CASE_INSENSITIVE
        )

        // UI action and navigation words that MUST NOT be treated as merchant/payee
        private val UI_IGNORE_WORDS = setOf(
            "back", "navigate up", "close", "done", "cancel", "help", "search",
            "more options", "details", "split", "split with friends", "share",
            "pay", "request", "send", "chat", "message", "view history",
            "payment details", "transaction details", "view balance", "check balance",
            "repeat", "send again", "pay again", "upi id", "google transaction id",
            "upi transaction id", "banking name", "paid", "completed", "successful",
            "transferred", "received", "debited", "credited", "payment", "transaction",
            "google pay", "phonepe", "paytm", "bhim", "kotak811", "kotak", "navi",
            "show menu", "view", "menu", "avatar", "profile", "call", "audio call", "video call"
        )

        // Deduplication cache
        private var lastCapturedHash = ""
        private var lastCapturedTime = 0L
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // 1. Strictly ignore scroll events — scrolling through chat/history must NEVER trigger capture
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            return
        }

        val pkgName = event.packageName?.toString() ?: return

        try {
            val rootNode = rootInActiveWindow ?: return
            val screenTexts = mutableListOf<String>()
            traverseNode(rootNode, screenTexts)

            if (screenTexts.isEmpty()) return
            val joinedText = screenTexts.joinToString(" ").lowercase(Locale.US)

            // 2. Reject input/PIN/failed screens
            if (REJECT_INPUT_KEYWORDS.any { joinedText.contains(it) }) {
                return
            }

            var detectedAmount = 0.0
            var detectedMerchant = ""

            // MODE A: Google Pay Chat Conversation View
            if (pkgName == "com.google.android.apps.nbu.paisa.user" &&
                joinedText.contains("payment to") &&
                !joinedText.contains("payment to you")) {

                val (amount, merchant) = extractFreshGPayBubble(screenTexts)
                if (amount > 0.0 && merchant.isNotBlank()) {
                    detectedAmount = amount
                    detectedMerchant = merchant
                }
            }

            // MODE B: Dedicated Payment Success Receipt Screen (PhonePe, Paytm, Navi, GPay Receipt, Bank Apps)
            if (detectedAmount <= 0.0) {
                val hasReceiptConfirm = RECEIPT_CONFIRM_KEYWORDS.any { joinedText.contains(it) }
                if (!hasReceiptConfirm) return

                // Reject if this is a chat feed with "Pay" or "Request" buttons
                val hasChatBar = screenTexts.any {
                    val clean = it.trim().lowercase(Locale.US)
                    clean == "pay" || clean == "request" || clean == "start a payment or"
                }
                if (hasChatBar) return

                // Extract single amount on screen
                val foundAmounts = mutableListOf<Double>()
                for (text in screenTexts) {
                    val matcher = AMOUNT_PATTERN.matcher(text)
                    while (matcher.find()) {
                        val rawStr = matcher.group(1)?.replace(",", "") ?: ""
                        val parsed = rawStr.toDoubleOrNull() ?: 0.0
                        if (parsed > 0.0 && parsed < 10000000.0) {
                            foundAmounts.add(parsed)
                        }
                    }
                }

                val distinctAmounts = foundAmounts.distinct()
                if (distinctAmounts.size != 1) return

                detectedAmount = distinctAmounts.first()
                detectedMerchant = extractMerchantFromTexts(screenTexts, pkgName)
            }

            if (detectedAmount <= 0.0 || detectedMerchant.isBlank()) return
            if (UI_IGNORE_WORDS.contains(detectedMerchant.lowercase(Locale.US))) return

            // 3. Memory deduplication (15-second debounce for same payment)
            val formattedAmount = String.format(Locale.US, "%.2f", detectedAmount)
            val currentHash = "$pkgName:$formattedAmount:$detectedMerchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 15000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.d(TAG, "🎯 Verified Payment Captured from Screen: ₹$detectedAmount at $detectedMerchant (pkg: $pkgName)")

            // Persist locally and show system heads-up notification (works even when app is killed)
            AutoCaptureStorage.saveCapturedPayment(applicationContext, detectedAmount, detectedMerchant, "screen_detect", pkgName)

            // Emit to React Native UI if app is open
            emitEventToReactNative(applicationContext, "onPaymentScreenDetected", Arguments.createMap().apply {
                putDouble("amount", detectedAmount)
                putString("merchant", detectedMerchant)
                putString("source", "screen_detect")
                putString("packageName", pkgName)
                putDouble("timestamp", now.toDouble())
            })

        } catch (e: Exception) {
            Log.e(TAG, "Error in accessibility reader", e)
        }
    }

    /**
     * Inspects Google Pay screen texts to find the latest OUTGOING payment bubble
     * that was created right now (within 3 minutes of current wall-clock time).
     */
    private fun extractFreshGPayBubble(texts: List<String>): Pair<Double, String> {
        // Iterate backwards from bottom (latest messages) to top
        for (i in texts.indices.reversed()) {
            val t = texts[i]
            val bubbleMatcher = GPAY_OUTGOING_BUBBLE_PATTERN.matcher(t)
            if (bubbleMatcher.find()) {
                val candidateMerchant = bubbleMatcher.group(1)?.trim() ?: ""

                // Must be outgoing to a person/merchant, NOT "you"
                if (candidateMerchant.equals("you", ignoreCase = true)) {
                    continue
                }

                // Look at nearby texts (within 3 nodes around this bubble) for amount and timestamp
                var bubbleAmount = 0.0
                var isFresh = false

                val startIdx = Math.max(0, i - 1)
                val endIdx = Math.min(texts.size - 1, i + 4)

                for (j in startIdx..endIdx) {
                    val subText = texts[j]

                    // Check amount
                    if (bubbleAmount <= 0.0) {
                        val mAmount = AMOUNT_PATTERN.matcher(subText)
                        if (mAmount.find()) {
                            val raw = mAmount.group(1)?.replace(",", "") ?: ""
                            bubbleAmount = raw.toDoubleOrNull() ?: 0.0
                        }
                    }

                    // Check freshness timestamp (e.g. "Paid • 6:26 pm" or "Just now")
                    if (!isFresh && isTimestampFresh(subText)) {
                        isFresh = true
                    }
                }

                if (bubbleAmount > 0.0 && isFresh && candidateMerchant.length in 2..40) {
                    return Pair(bubbleAmount, candidateMerchant)
                }
            }
        }
        return Pair(0.0, "")
    }

    /**
     * Checks if a timestamp string is within the last 3 minutes of current wall-clock time.
     */
    private fun isTimestampFresh(text: String): Boolean {
        if (text.contains("just now", ignoreCase = true)) {
            return true
        }

        // Match "Paid • 6:26 pm" or "6:26 pm"
        val timeMatcher = Pattern.compile("""\b(\d{1,2}):(\d{2})\s*(am|pm)\b""", Pattern.CASE_INSENSITIVE).matcher(text)
        if (timeMatcher.find()) {
            try {
                var hours = timeMatcher.group(1)?.toIntOrNull() ?: return false
                val minutes = timeMatcher.group(2)?.toIntOrNull() ?: return false
                val ampm = timeMatcher.group(3)?.lowercase(Locale.US) ?: ""

                if (ampm == "pm" && hours < 12) hours += 12
                if (ampm == "am" && hours == 12) hours = 0

                val bubbleMinutesOfDay = hours * 60 + minutes

                val cal = Calendar.getInstance()
                val nowMinutesOfDay = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

                val diff = Math.abs(nowMinutesOfDay - bubbleMinutesOfDay)
                // Within 3 minutes of current time
                return diff <= 3 || diff >= (24 * 60 - 3)
            } catch (e: Exception) {
                return false
            }
        }
        return false
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
                        !UI_IGNORE_WORDS.contains(candidate.lowercase(Locale.US))) {
                        return candidate
                    }
                }
            }
        }

        // For Google Pay
        if (pkg == "com.google.android.apps.nbu.paisa.user") {
            for (t in texts) {
                val clean = t.trim()
                val lower = clean.lowercase(Locale.US)
                if (clean.length in 2..35 &&
                    !UI_IGNORE_WORDS.contains(lower) &&
                    !clean.contains("₹") &&
                    !clean.contains("rs", ignoreCase = true) &&
                    !clean.matches(Regex("""^[+\d\s-]{8,20}$""")) &&
                    !clean.matches(Regex("""^\d{1,2}\s+[A-Za-z]{3}.*""")) &&
                    !lower.contains("pm") && !lower.contains("am") &&
                    !lower.contains("google pay") &&
                    !lower.contains("upi")) {
                    return clean
                }
            }
            return "Google Pay"
        }

        return when (pkg) {
            "com.phonepe.app" -> "PhonePe"
            "net.one97.paytm" -> "Paytm"
            "com.naviapp" -> "Navi UPI"
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
