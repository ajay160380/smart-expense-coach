package com.ajay160380.paisamitra.autocapture

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ajay160380.paisamitra.R
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

object AutoCaptureStorage {
    private const val TAG = "AutoCaptureStorage"
    private const val PREFS_NAME = "paisamitra_autocapture_store"
    private const val KEY_PENDING = "pending_auto_expenses"
    private const val KEY_AUTH_TOKEN = "auth_token"
    private const val KEY_BACKEND_URL = "api_base_url"
    private const val DEFAULT_BACKEND_URL = "https://expense-coach-prxm.onrender.com"

    fun saveCapturedPayment(
        context: Context,
        amount: Double,
        merchant: String,
        source: String,
        pkgName: String
    ) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // 1. Deduplication: ignore duplicate captures of same amount within 15 seconds (e.g. App notif + Bank SMS)
            val dedupKey = "last_capture_amount_${amount.toLong()}"
            val lastCaptureTime = prefs.getLong(dedupKey, 0L)
            val now = System.currentTimeMillis()
            if ((now - lastCaptureTime) < 15000L) {
                Log.d(TAG, "⚡ Debounce: Ignoring duplicate capture for ₹$amount within 15s")
                return
            }
            prefs.edit().putLong(dedupKey, now).apply()

            // 2. Save locally in pending array
            val existing = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(existing)
            val itemId = UUID.randomUUID().toString()

            val item = JSONObject().apply {
                put("id", itemId)
                put("amount", amount)
                put("merchant", merchant)
                put("source", source)
                put("packageName", pkgName)
                put("timestamp", now)
                put("synced", false)
            }
            array.put(item)
            prefs.edit().putString(KEY_PENDING, array.toString()).apply()
            Log.d(TAG, "Saved payment locally: ₹$amount at $merchant (id: $itemId)")

            // 3. Show instant system heads-up notification
            showSystemNotification(context, amount, merchant)

            // 4. Background native direct sync to backend database (works even when app is closed)
            syncDirectlyToBackend(context, itemId, amount, merchant)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving payment to storage", e)
        }
    }

    private fun syncDirectlyToBackend(
        context: Context,
        itemId: String,
        amount: Double,
        merchant: String
    ) {
        Thread {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val token = prefs.getString(KEY_AUTH_TOKEN, null)
                if (token.isNullOrBlank()) {
                    Log.w(TAG, "No auth token in SharedPreferences yet; will sync when app opens")
                    return@Thread
                }

                val baseUrl = prefs.getString(KEY_BACKEND_URL, DEFAULT_BACKEND_URL)?.trimEnd('/') ?: DEFAULT_BACKEND_URL
                val endpointUrl = URL("$baseUrl/api/quick-add/")
                val conn = (endpointUrl.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Authorization", "Token $token")
                    connectTimeout = 20000
                    readTimeout = 20000
                    doOutput = true
                }

                val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                val body = JSONObject().apply {
                    put("amount", amount)
                    put("category", "other")
                    put("description", "⚡ $merchant")
                    put("date", today)
                }

                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                    writer.write(body.toString())
                    writer.flush()
                }

                val responseCode = conn.responseCode
                Log.d(TAG, "⚡ Direct native sync to $endpointUrl finished with HTTP $responseCode")

                if (responseCode in 200..299) {
                    markItemSynced(context, itemId)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Direct native sync background network error: ${e.message}")
            }
        }.start()
    }

    @Synchronized
    private fun markItemSynced(context: Context, itemId: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(existing)
            val updated = JSONArray()

            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                if (obj.optString("id") == itemId) {
                    obj.put("synced", true)
                }
                updated.put(obj)
            }
            prefs.edit().putString(KEY_PENDING, updated.toString()).apply()
            Log.d(TAG, "Item $itemId marked as synced")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mark item synced", e)
        }
    }

    fun popPendingExpenses(context: Context): String {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            // Reset pending list once fetched by React Native
            prefs.edit().putString(KEY_PENDING, "[]").apply()
            json
        } catch (e: Exception) {
            "[]"
        }
    }

    private fun showSystemNotification(context: Context, amount: Double, merchant: String) {
        try {
            val channelId = "expense_tracker_alerts_v2"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "PaisaMitra Auto-Capture",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Instant notifications when payments are auto-captured"
                    enableVibration(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = if (launchIntent != null) {
                PendingIntent.getActivity(context, 0, launchIntent, flags)
            } else null

            val formattedAmount = if (amount % 1.0 == 0.0) {
                String.format(Locale.US, "%.0f", amount)
            } else {
                String.format(Locale.US, "%.2f", amount)
            }

            val notif = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("⚡ PaisaMitra Auto-Captured")
                .setContentText("₹$formattedAmount paid to $merchant recorded!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .apply {
                    if (pendingIntent != null) setContentIntent(pendingIntent)
                }
                .build()

            notificationManager.notify((System.currentTimeMillis() % 100000).toInt(), notif)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to display system notification", e)
        }
    }
}
