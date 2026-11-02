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
 * Intelligent Accessibility Service for Payment Confirmation Screens.
 * Specifically targets the final receipt screen (with "Done" button, checkmark, and "Paid to").
 * Automatically ignores sponsored ads, chat feeds, and scrolling.
 */
class PaymentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PaymentAccessibility"

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
            "payment failed",
            "transaction failed",
            "payment declined",
            "transaction declined",
            "incorrect upi pin",
            "wrong upi pin"
        )

        private val AMOUNT_PATTERN = Pattern.compile(
            """(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)""",
            Pattern.CASE_INSENSITIVE
        )

        private val UI_IGNORE_WORDS = setOf(
            "back", "navigate up", "close", "done", "cancel", "help", "search",
            "more options", "details", "split", "split with friends", "share",
            "share screenshot", "powered by upi", "pay", "request", "send", "chat",
            "message", "view history", "payment details", "transaction details",
            "view balance", "check balance", "repeat", "send again", "pay again",
            "upi id", "google transaction id", "upi transaction id", "banking name",
            "paid", "completed", "successful", "transferred", "received", "debited",
            "credited", "payment", "transaction", "google pay", "phonepe", "paytm",
            "bhim", "kotak811", "kotak", "navi", "show menu", "view", "menu",
            "sponsored", "rewards", "earn rewards", "powered by"
        )

        // Cache recently captured payments to prevent rapid-fire duplicates
        private var lastCapturedHash = ""
        private var lastCapturedTime = 0L
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Ignore scrolling events
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            return
        }

        val pkgName = event.packageName?.toString() ?: return

        try {
            val screenTexts = mutableListOf<String>()
            val root = rootInActiveWindow
            if (root != null) {
                traverseNode(root, screenTexts)
            }
            if (screenTexts.isEmpty()) {
                try {
                    windows?.forEach { win ->
                        win.root?.let { traverseNode(it, screenTexts) }
                    }
                } catch (e: Exception) {}
            }

            if (screenTexts.isEmpty()) return
            val joinedText = screenTexts.joinToString(" ").lowercase(Locale.US)

            Log.i(TAG, "🔍 [$pkgName] EventType: ${event.eventType} | Texts: ${screenTexts.joinToString(" | ")}")

            // 1. Must NOT be an input/pending/failed screen
            if (REJECT_INPUT_KEYWORDS.any { joinedText.contains(it) }) {
                return
            }

            var detectedAmount = 0.0
            var detectedMerchant = ""

            // MODE A: Google Pay Payment Success Receipt Screen
            // (Contains "Paid to", "Done" or "Share screenshot" or "Powered by UPI")
            if (pkgName == "com.google.android.apps.nbu.paisa.user") {
                val hasDone = screenTexts.any { it.trim().equals("Done", ignoreCase = true) }
                val hasShare = joinedText.contains("share") || joinedText.contains("screenshot") || joinedText.contains("powered by upi") || joinedText.contains("google transaction id")
                val hasPaidTo = joinedText.contains("paid to") || joinedText.contains("payment to") || joinedText.contains("paid")
                val isChatBar = screenTexts.any { it.trim().lowercase(Locale.US) == "request" }

                if (hasPaidTo && !isChatBar && (hasDone || hasShare)) {
                    // 1. Extract Amount: check text before "sponsored" (handles ₹ and amount in same or adjacent nodes)
                    val textBeforeSponsored = if (joinedText.contains("sponsored")) {
                        joinedText.substringBefore("sponsored")
                    } else {
                        joinedText
                    }

                    val amountMatcher = AMOUNT_PATTERN.matcher(textBeforeSponsored)
                    if (amountMatcher.find()) {
                        val rawStr = amountMatcher.group(1)?.replace(",", "") ?: ""
                        detectedAmount = rawStr.toDoubleOrNull() ?: 0.0
                    }

                    // Fallback for amount split across nodes (Node i = "₹", Node i+1 = "1")
                    if (detectedAmount <= 0.0) {
                        for (i in screenTexts.indices) {
                            val t = screenTexts[i].trim()
                            if (t.contains("sponsored", ignoreCase = true)) break
                            if (t == "₹" || t.equals("rs", ignoreCase = true) || t.equals("rs.", ignoreCase = true)) {
                                if (i + 1 < screenTexts.size) {
                                    val next = screenTexts[i + 1].trim().replace(",", "")
                                    val parsed = next.toDoubleOrNull() ?: 0.0
                                    if (parsed > 0.0 && parsed < 10000000.0) {
                                        detectedAmount = parsed
                                        break
                                    }
                                }
                            }
                            val m = AMOUNT_PATTERN.matcher(t)
                            if (m.find()) {
                                val parsed = m.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                                if (parsed > 0.0 && parsed < 10000000.0) {
                                    detectedAmount = parsed
                                    break
                                }
                            }
                        }
                    }

                    // 2. Extract Merchant: text right after "Paid to" or right before UPI ID
                    for (i in screenTexts.indices) {
                        val t = screenTexts[i].trim()
                        if (t.equals("Paid to", ignoreCase = true) || t.equals("Payment to", ignoreCase = true)) {
                            if (i + 1 < screenTexts.size) {
                                val cand = screenTexts[i + 1].trim()
                                if (cand.length in 2..40 && !UI_IGNORE_WORDS.contains(cand.lowercase(Locale.US))) {
                                    detectedMerchant = cand
                                    break
                                }
                            }
                        }
                        val m = Pattern.compile("""(?:paid to|payment to)\s+([A-Za-z0-9\s&'.-]+)""", Pattern.CASE_INSENSITIVE).matcher(t)
                        if (m.find()) {
                            val cand = m.group(1)?.trim() ?: ""
                            if (cand.length in 2..40 && !UI_IGNORE_WORDS.contains(cand.lowercase(Locale.US))) {
                                detectedMerchant = cand
                                break
                            }
                        }
                    }

                    // Fallback: look for recipient text right before the UPI ID (e.g. "AJAY VISHWAKARMA" before "7905398965@kotakbank")
                    if (detectedMerchant.isBlank()) {
                        for (i in screenTexts.indices) {
                            val t = screenTexts[i].trim()
                            if (t.contains("@") && i > 0) {
                                val prev = screenTexts[i - 1].trim()
                                if (prev.length in 2..40 && !UI_IGNORE_WORDS.contains(prev.lowercase(Locale.US)) && !prev.contains("₹")) {
                                    detectedMerchant = prev
                                    break
                                }
                            }
                        }
                    }
                }
            }

            // MODE B: Universal Receipt Screen (PhonePe, Paytm, Navi UPI, Bank Apps)
            if (detectedAmount <= 0.0) {
                val hasDone = screenTexts.any { it.trim().equals("Done", ignoreCase = true) }
                val hasReceiptConfirm = RECEIPT_CONFIRM_KEYWORDS.any { joinedText.contains(it) }

                // Must NOT have chat buttons ("Pay", "Request", "Message")
                val hasChatBar = screenTexts.any {
                    val clean = it.trim().lowercase(Locale.US)
                    clean == "pay" || clean == "request" || clean == "start a payment or"
                }

                if ((hasReceiptConfirm || hasDone) && !hasChatBar) {
                    val textBeforePromo = if (joinedText.contains("sponsored")) joinedText.substringBefore("sponsored") else joinedText
                    val matcher = AMOUNT_PATTERN.matcher(textBeforePromo)
                    if (matcher.find()) {
                        val rawStr = matcher.group(1)?.replace(",", "") ?: ""
                        detectedAmount = rawStr.toDoubleOrNull() ?: 0.0
                    }

                    detectedMerchant = extractMerchantFromTexts(screenTexts, pkgName)
                }
            }

            if (detectedAmount <= 0.0 || detectedMerchant.isBlank()) return
            if (UI_IGNORE_WORDS.contains(detectedMerchant.lowercase(Locale.US))) return

            // 3. Memory deduplication (15-second debounce)
            val formattedAmount = String.format(Locale.US, "%.2f", detectedAmount)
            val currentHash = "$pkgName:$formattedAmount:$detectedMerchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 15000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.d(TAG, "🎯 Payment Confirmed: ₹$detectedAmount paid to $detectedMerchant (pkg: $pkgName)")

            // Persist locally, sync to backend, and show instant heads-up alert
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
