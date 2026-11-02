package com.ajay160380.paisamitra.autocapture

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale
import java.util.regex.Pattern

/**
 * Ultra-efficient Accessibility Service for payment success screens ONLY.
 * Listens ONLY to TYPE_WINDOW_STATE_CHANGED (new screen opened).
 * NEVER triggers on scrolling, chat conversations, passbooks, or message lists.
 * Zero battery drain.
 */
class PaymentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PaymentAccessibility"

        // Explicit confirmation indicators required on a genuine receipt screen
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

        // If the screen contains ANY of these, it is a chat, passbook, message thread, or input screen -> REJECT!
        private val REJECT_SCREEN_KEYWORDS = listOf(
            "enter upi pin",
            "enter pin",
            "pay now",
            "request payment",
            "failed",
            "declined",
            "cancelled",
            "retry",
            "split with friends",
            "payment to you",     // Incoming payment in chat
            "received from",      // Incoming payment
            "money received",     // Incoming payment
            "credited to",        // Incoming credit
            "passbook",           // Passbook / history list
            "transaction history",// Transaction list
            "payment history",    // Transaction list
            "statement",          // Bank / account statement
            "all transactions",   // History list
            "recent transactions",// History list
            "type a message",     // Chat text field
            "send a message",     // Chat text field
            "message...",         // Chat text field
            "start a payment or", // GPay chat bar
            "start a chat",       // Chat screen
            "show menu"           // Chat top-right overflow menu
        )

        private val AMOUNT_PATTERN = Pattern.compile(
            """(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""",
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

        // Cache recently captured payments to prevent rapid-fire duplicates
        private var lastCapturedHash = ""
        private var lastCapturedTime = 0L
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // 1. Strictly ignore scroll events and micro content changes
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return
        }

        val pkgName = event.packageName?.toString() ?: return

        try {
            val rootNode = rootInActiveWindow ?: return
            val screenTexts = mutableListOf<String>()
            traverseNode(rootNode, screenTexts)

            if (screenTexts.isEmpty()) return
            val joinedText = screenTexts.joinToString(" ").lowercase(Locale.US)

            // 2. Must NOT be an input, chat, conversation feed, or passbook screen
            if (REJECT_SCREEN_KEYWORDS.any { joinedText.contains(it) }) {
                return
            }

            // 3. Must contain an explicit receipt confirmation indicator
            val hasReceiptConfirm = RECEIPT_CONFIRM_KEYWORDS.any { joinedText.contains(it) }
            if (!hasReceiptConfirm) {
                return
            }

            // 4. Must NOT have interactive chat buttons like "Pay" or "Request" or "Message"
            val hasChatButtons = screenTexts.any {
                val clean = it.trim().lowercase(Locale.US)
                clean == "pay" || clean == "request" || clean == "message" || clean == "show menu"
            }
            if (hasChatButtons) {
                return
            }

            // 5. Extract Amount: A genuine payment receipt displays EXACTLY ONE amount
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

            // If there are multiple different amounts on screen, it's a list or history view
            val distinctAmounts = foundAmounts.distinct()
            if (distinctAmounts.size != 1) {
                return
            }
            val extractedAmount = distinctAmounts.first()

            // 6. Extract Merchant/Payee
            val merchant = extractMerchantFromTexts(screenTexts, pkgName)
            if (merchant.isBlank() || UI_IGNORE_WORDS.contains(merchant.lowercase(Locale.US))) {
                return
            }

            // 7. Memory deduplication (15-second debounce)
            val formattedAmount = String.format(Locale.US, "%.2f", extractedAmount)
            val currentHash = "$pkgName:$formattedAmount:$merchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 15000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.d(TAG, "🎯 Payment Detected from Screen: ₹$extractedAmount at $merchant (pkg: $pkgName)")

            // Always persist locally and show system heads-up notification (works even when app is killed)
            AutoCaptureStorage.saveCapturedPayment(applicationContext, extractedAmount, merchant, "screen_detect", pkgName)

            // 8. Emit event to React Native UI if app is foreground/alive
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
                        !UI_IGNORE_WORDS.contains(candidate.lowercase(Locale.US))) {
                        return candidate
                    }
                }
            }
        }

        // For Google Pay: scan texts from top to bottom, finding first legitimate recipient name
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
                    !lower.contains("upi") &&
                    !lower.contains("yesterday") &&
                    !lower.contains("today")) {
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
