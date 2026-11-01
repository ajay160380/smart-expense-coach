package com.ajay160380.paisamitra.autocapture

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AutoCaptureModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AutoCaptureModule"

    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        try {
            val packageName = reactContext.packageName
            val flat = Settings.Secure.getString(reactContext.contentResolver, "enabled_notification_listeners")
            val enabled = !TextUtils.isEmpty(flat) && flat.contains(packageName)
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERR_NOTIF_CHECK", e.message)
        }
    }

    @ReactMethod
    fun openNotificationListenerSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            val fallback = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
        }
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val expectedComponentName = ComponentName(reactContext, PaymentAccessibilityService::class.java).flattenToString()
            val enabledServices = Settings.Secure.getString(reactContext.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            val accessibilityEnabled = Settings.Secure.getInt(reactContext.contentResolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0)

            val isEnabled = accessibilityEnabled == 1 && !TextUtils.isEmpty(enabledServices) && enabledServices.contains(expectedComponentName)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ERR_ACCESSIBILITY_CHECK", e.message)
        }
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            val fallback = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(fallback)
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val isIgnoring = powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
                promise.resolve(isIgnoring)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_BATTERY_CHECK", e.message)
        }
    }

    @ReactMethod
    fun openBatteryOptimizationSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(fallback)
            } catch (e2: Exception) {}
        }
    }
}
