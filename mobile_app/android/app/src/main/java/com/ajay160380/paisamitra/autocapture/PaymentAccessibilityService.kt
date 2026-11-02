package com.ajay160380.paisamitra.autocapture

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
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
 * Works seamlessly with Google Pay, PhonePe, Paytm, Navi, Kotak, BHIM, and bank UPI apps.
 * Captures the genuine final receipt confirmation screen and completely ignores chat feeds,
 * scrolling history, and promotional ads.
 */
class PaymentAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PaymentAccessibility"

        private val SUPPORTED_PACKAGES = setOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe
            "net.one97.paytm",                       // Paytm
            "in.org.npci.upiapp",                    // BHIM UPI
            "com.naviapp",                           // Navi UPI
            "com.kotak811mobilebankingapp.instantsavingsupiscanandpayrecharge", // Kotak 811
            "com.msf.kopl",                          // Kotak Mahindra Bank
            "com.snapwork.hdfc",                     // HDFC Bank
            "com.hdfcbank.payzapp",                  // PayZapp
            "com.sbi.upi",                           // SBI Pay
            "com.sbi.lotusintouch",                  // YONO SBI
            "com.csam.icici.bank.imobile",           // ICICI iMobile
            "com.axis.mobile",                       // Axis Mobile
            "com.bankofbaroda.mconnect",             // bob World
            "com.pnb.mb",                            // PNB ONE
            "com.canarabank.mobility",               // Canara ai1
            "com.idfcfirstbank.optimus",             // IDFC FIRST
            "com.indusind.mpassbook",                // IndusInd
            "com.dreamplug.androidapp",              // CRED
            "com.fivehundredrishabh.slice",          // Slice
            "money.jupiter",                         // Jupiter
            "money.fi",                              // Fi Money
            "com.myairtelapp",                       // Airtel Thanks
            "com.jio.myjio"                          // MyJio UPI
        )

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
            "reference no",
            "share screenshot",
            "share receipt"
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

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            val info = AccessibilityServiceInfo().apply {
                eventTypes = AccessibilityEvent.TYPES_ALL_MASK
                feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
                flags = AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                        AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                        AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                notificationTimeout = 50
            }
            serviceInfo = info
            Log.i(TAG, "🚀 PaymentAccessibilityService CONNECTED with full window retrieval & view IDs!")
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring AccessibilityServiceInfo", e)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Ignore scrolling events to prevent capturing past chat history
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            return
        }

        val pkgName = event.packageName?.toString() ?: return

        // Fast reject system UI and self
        if (pkgName.startsWith("com.android.systemui") ||
            pkgName.startsWith("com.google.android.inputmethod") ||
            pkgName == "com.ajay160380.paisamitra") {
            return
        }

        // Only process financial / payment / UPI apps
        val isPaymentApp = SUPPORTED_PACKAGES.contains(pkgName.lowercase(Locale.US)) ||
                           pkgName.contains("paisa", ignoreCase = true) ||
                           pkgName.contains("pay", ignoreCase = true) ||
                           pkgName.contains("upi", ignoreCase = true) ||
                           pkgName.contains("bank", ignoreCase = true) ||
                           pkgName.contains("wallet", ignoreCase = true)
        if (!isPaymentApp) return

        try {
            val screenTexts = mutableListOf<String>()

            // 1. Direct event text
            event.text?.forEach { cs ->
                val s = cs?.toString()?.trim() ?: ""
                if (s.isNotEmpty()) screenTexts.add(s)
            }

            // 2. Event source node
            try {
                event.source?.let { traverseNode(it, screenTexts) }
            } catch (e: Exception) {}

            // 3. Active Window root node
            try {
                rootInActiveWindow?.let { traverseNode(it, screenTexts) }
            } catch (e: Exception) {}

            // 4. Interactive windows
            try {
                windows?.forEach { win ->
                    win.root?.let { traverseNode(it, screenTexts) }
                }
            } catch (e: Exception) {}

            if (screenTexts.isEmpty()) return

            val joinedText = screenTexts.joinToString(" ").lowercase(Locale.US)

            // Ignore screens during PIN entry or failure
            if (REJECT_INPUT_KEYWORDS.any { joinedText.contains(it) }) {
                return
            }

            var detectedAmount = 0.0
            var detectedMerchant = ""

            // =========================================================================
            // MODE A: Google Pay Payment Success Receipt Screen
            // (Distinctive elements: "Paid to" or checkmark, "Done" button, recipient, amount)
            // =========================================================================
            if (pkgName == "com.google.android.apps.nbu.paisa.user") {
                val hasDone = screenTexts.any { it.trim().equals("Done", ignoreCase = true) }
                val hasShare = joinedText.contains("share") || joinedText.contains("screenshot") ||
                               joinedText.contains("powered by upi") || joinedText.contains("google transaction id") ||
                               joinedText.contains("upi ref") || joinedText.contains("completed")
                val hasPaidTo = joinedText.contains("paid to") || joinedText.contains("payment to") || joinedText.contains("paid")

                // Must NOT be inside a chat conversation with a "Request" or "Pay" action bar at the bottom
                val isChatBar = screenTexts.any {
                    val s = it.trim().lowercase(Locale.US)
                    s == "request" || s == "pay" || s == "start a payment"
                }

                if (hasPaidTo && !isChatBar && (hasDone || hasShare)) {
                    Log.i(TAG, "🎯 GPay Confirmation Screen Detected! Screen texts: ${screenTexts.joinToString(" | ")}")

                    // Extract amount: look through texts, ignoring ad/promo clauses
                    for (i in screenTexts.indices) {
                        val t = screenTexts[i].trim()
                        val lower = t.lowercase(Locale.US)

                        // Skip ad/promo texts
                        if (lower.contains("sponsored") || lower.contains("fire tv") || lower.contains("earn") ||
                            lower.contains("cashback") || lower.contains("at ₹") || lower.contains("upto")) {
                            continue
                        }

                        // Check standalone "₹" followed by the amount in next node
                        if (t == "₹" || t.equals("rs", ignoreCase = true) || t.equals("rs.", ignoreCase = true)) {
                            if (i + 1 < screenTexts.size) {
                                val nextCandidate = screenTexts[i + 1].trim().replace(",", "")
                                val parsed = nextCandidate.toDoubleOrNull() ?: 0.0
                                if (parsed in 0.01..500000.0) {
                                    detectedAmount = parsed
                                    break
                                }
                            }
                        }

                        // Check combined currency + amount string (e.g. "₹1.40" or "₹ 1")
                        val matcher = AMOUNT_PATTERN.matcher(t)
                        if (matcher.find()) {
                            val parsed = matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                            if (parsed in 0.01..500000.0) {
                                detectedAmount = parsed
                                break
                            }
                        }
                    }

                    // Extract recipient merchant name
                    for (i in screenTexts.indices) {
                        val t = screenTexts[i].trim()
                        if (t.equals("Paid to", ignoreCase = true) || t.equals("Payment to", ignoreCase = true)) {
                            if (i + 1 < screenTexts.size) {
                                val cand = screenTexts[i + 1].trim()
                                if (cand.length in 2..40 && !cand.contains("@") && !cand.contains("₹") && !UI_IGNORE_WORDS.contains(cand.lowercase(Locale.US))) {
                                    detectedMerchant = cand
                                    break
                                }
                            }
                        }
                        val m = Pattern.compile("""(?:paid to|payment to)\s+([A-Za-z0-9\s&'.-]+)""", Pattern.CASE_INSENSITIVE).matcher(t)
                        if (m.find()) {
                            val cand = m.group(1)?.trim() ?: ""
                            if (cand.length in 2..40 && !cand.contains("@") && !cand.contains("₹") && !UI_IGNORE_WORDS.contains(cand.lowercase(Locale.US))) {
                                detectedMerchant = cand
                                break
                            }
                        }
                    }

                    // Fallback for recipient: text right before UPI handle (e.g. "AJAY VISHWAKARMA" before "7905398965@kotakbank")
                    if (detectedMerchant.isBlank()) {
                        for (i in screenTexts.indices) {
                            val t = screenTexts[i].trim()
                            if (t.contains("@") && i > 0) {
                                val prev = screenTexts[i - 1].trim()
                                if (prev.length in 2..40 && !prev.contains("₹") &&
                                    !prev.equals("paid to", ignoreCase = true) &&
                                    !UI_IGNORE_WORDS.contains(prev.lowercase(Locale.US))) {
                                    detectedMerchant = prev
                                    break
                                }
                            }
                        }
                    }

                    if (detectedMerchant.isBlank()) {
                        detectedMerchant = "Google Pay"
                    }
                }
            }

            // =========================================================================
            // MODE B: Universal UPI Apps (PhonePe, Paytm, Navi, Kotak 811, BHIM, Bank Apps)
            // =========================================================================
            if (detectedAmount <= 0.0) {
                val hasDone = screenTexts.any { it.trim().equals("Done", ignoreCase = true) }
                val hasReceiptConfirm = RECEIPT_CONFIRM_KEYWORDS.any { joinedText.contains(it) } ||
                                      (joinedText.contains("successful") && (joinedText.contains("transfer") || joinedText.contains("paid") || joinedText.contains("sent"))) ||
                                      (joinedText.contains("paid to") && (joinedText.contains("debited") || joinedText.contains("transaction") || joinedText.contains("utr")))

                // Ensure it is not a chat screen with a "Pay" or "Request" input field
                val hasChatBar = screenTexts.any {
                    val clean = it.trim().lowercase(Locale.US)
                    clean == "pay" || clean == "request" || clean == "start a payment or"
                }

                if ((hasReceiptConfirm || hasDone) && !hasChatBar) {
                    for (i in screenTexts.indices) {
                        val t = screenTexts[i].trim()
                        val lower = t.lowercase(Locale.US)
                        if (lower.contains("sponsored") || lower.contains("upto") || lower.contains("at ₹") || lower.contains("cashback")) {
                            continue
                        }
                        if (t == "₹" || t.equals("rs", ignoreCase = true) || t.equals("rs.", ignoreCase = true)) {
                            if (i + 1 < screenTexts.size) {
                                val nextCandidate = screenTexts[i + 1].trim().replace(",", "")
                                val parsed = nextCandidate.toDoubleOrNull() ?: 0.0
                                if (parsed in 0.01..500000.0) {
                                    detectedAmount = parsed
                                    break
                                }
                            }
                        }
                        val matcher = AMOUNT_PATTERN.matcher(t)
                        if (matcher.find()) {
                            val parsed = matcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                            if (parsed in 0.01..500000.0) {
                                detectedAmount = parsed
                                break
                            }
                        }
                    }

                    detectedMerchant = extractMerchantFromTexts(screenTexts, pkgName)
                }
            }

            if (detectedAmount <= 0.0 || detectedMerchant.isBlank()) {
                return
            }

            if (UI_IGNORE_WORDS.contains(detectedMerchant.lowercase(Locale.US))) {
                detectedMerchant = getAppDisplayName(pkgName)
            }

            // 15-second debounce on the same amount & recipient to prevent duplicate logging
            val formattedAmount = String.format(Locale.US, "%.2f", detectedAmount)
            val currentHash = "$pkgName:$formattedAmount:$detectedMerchant"
            val now = System.currentTimeMillis()
            if (currentHash == lastCapturedHash && (now - lastCapturedTime) < 15000L) {
                return
            }
            lastCapturedHash = currentHash
            lastCapturedTime = now

            Log.i(TAG, "⚡ PAYMENT CONFIRMED: ₹$detectedAmount paid to $detectedMerchant (pkg: $pkgName)")

            // 1. Save locally in SharedPreferences, background sync to backend, and show instant heads-up alert
            AutoCaptureStorage.saveCapturedPayment(applicationContext, detectedAmount, detectedMerchant, "screen_detect", pkgName)

            // 2. Emit to React Native UI if app is open
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
                        !candidate.contains("@") &&
                        !candidate.contains("₹") &&
                        !UI_IGNORE_WORDS.contains(candidate.lowercase(Locale.US))) {
                        return candidate
                    }
                }
            }
        }

        // Check if there is an UPI ID line (e.g. "name@bank"), take previous line
        for (i in texts.indices) {
            val t = texts[i].trim()
            if (t.contains("@") && i > 0) {
                val prev = texts[i - 1].trim()
                if (prev.length in 2..40 && !prev.contains("₹") &&
                    !prev.equals("paid to", ignoreCase = true) &&
                    !UI_IGNORE_WORDS.contains(prev.lowercase(Locale.US))) {
                    return prev
                }
            }
        }

        return getAppDisplayName(pkg)
    }

    private fun getAppDisplayName(pkg: String): String {
        return when (pkg) {
            "com.google.android.apps.nbu.paisa.user" -> "Google Pay"
            "com.phonepe.app" -> "PhonePe"
            "net.one97.paytm" -> "Paytm"
            "com.naviapp" -> "Navi UPI"
            "in.org.npci.upiapp" -> "BHIM UPI"
            "com.kotak811mobilebankingapp.instantsavingsupiscanandpayrecharge" -> "Kotak 811"
            "com.msf.kopl" -> "Kotak Mahindra"
            "com.snapwork.hdfc", "com.hdfcbank.payzapp" -> "HDFC Bank"
            "com.csam.icici.bank.imobile" -> "ICICI Bank"
            "com.axis.mobile" -> "Axis Bank"
            "com.sbi.upi", "com.sbi.lotusintouch" -> "State Bank of India"
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
