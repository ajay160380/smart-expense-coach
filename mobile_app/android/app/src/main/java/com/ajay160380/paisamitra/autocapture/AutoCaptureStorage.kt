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
import java.util.UUID

object AutoCaptureStorage {
    private const val TAG = "AutoCaptureStorage"
    private const val PREFS_NAME = "paisamitra_autocapture_store"
    private const val KEY_PENDING = "pending_auto_expenses"

    fun saveCapturedPayment(
        context: Context,
        amount: Double,
        merchant: String,
        source: String,
        pkgName: String
    ) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getString(KEY_PENDING, "[]") ?: "[]"
            val array = JSONArray(existing)

            val item = JSONObject().apply {
                put("id", UUID.randomUUID().toString())
                put("amount", amount)
                put("merchant", merchant)
                put("source", source)
                put("packageName", pkgName)
                put("timestamp", System.currentTimeMillis())
            }
            array.put(item)
            prefs.edit().putString(KEY_PENDING, array.toString()).apply()
            Log.d(TAG, "Saved offline payment: ₹$amount at $merchant to SharedPreferences")

            showSystemNotification(context, amount, merchant)
        } catch (e: Exception) {
            Log.e(TAG, "Error saving payment to storage", e)
        }
    }

    fun popPendingExpenses(context: Context): String {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val json = prefs.getString(KEY_PENDING, "[]") ?: "[]"
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

            val notif = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("⚡ PaisaMitra Auto-Captured")
                .setContentText("₹$amount paid to $merchant recorded!")
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

