package com.mypa.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

/**
 * AlarmPermissionHelper - Ensures all critical permissions are granted
 *
 * ═══════════════════════════════════════════════════════════════
 * WHY ALARMS DON'T FIRE WHEN APP IS KILLED:
 * ═══════════════════════════════════════════════════════════════
 *
 * Android 12+ (API 31+):
 *   1. SCHEDULE_EXACT_ALARM permission needed (runtime check)
 *   2. Battery optimization can kill BroadcastReceiver
 *   3. Force-stop prevents ALL broadcasts until app is opened
 *
 * Android 9+ (API 28+):
 *   1. Battery optimization restricts background execution
 *   2. Adaptive Battery learns app usage patterns
 *
 * ═══════════════════════════════════════════════════════════════
 * SOLUTION:
 * ═══════════════════════════════════════════════════════════════
 * 1. Request SCHEDULE_EXACT_ALARM permission on Android 12+
 * 2. Request battery optimization exemption
 * 3. Educate user NOT to force-stop app
 */
public class AlarmPermissionHelper {
    private static final String TAG = "AlarmPermissionHelper";

    /**
     * Check if app can schedule exact alarms
     * Android 12+ requires explicit permission
     */
    public static boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ (API 31+)
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                boolean canSchedule = alarmManager.canScheduleExactAlarms();
                Log.d(TAG, "Can schedule exact alarms: " + canSchedule);
                return canSchedule;
            }
            return false;
        }
        // Android 11 and below - no permission needed
        return true;
    }

    /**
     * Request SCHEDULE_EXACT_ALARM permission (Android 12+)
     * Opens system settings for user to grant permission
     */
    public static void requestExactAlarmPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!canScheduleExactAlarms(context)) {
                Log.w(TAG, "Exact alarm permission not granted - opening settings");

                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);

                    Log.d(TAG, "✓ Opened exact alarm permission settings");
                } catch (Exception e) {
                    Log.e(TAG, "✗ Failed to open exact alarm settings", e);
                }
            } else {
                Log.d(TAG, "✓ Exact alarm permission already granted");
            }
        }
    }

    /**
     * Check if battery optimization is disabled for this app
     * If enabled, Android may kill alarm receiver
     */
    public static boolean isBatteryOptimizationDisabled(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                String packageName = context.getPackageName();
                boolean isIgnoring = pm.isIgnoringBatteryOptimizations(packageName);
                Log.d(TAG, "Battery optimization disabled: " + isIgnoring);
                return isIgnoring;
            }
        }
        return true; // Pre-Marshmallow - no battery optimization
    }

    /**
     * Request battery optimization exemption
     * CRITICAL for alarms to work when app is killed
     */
    public static void requestBatteryOptimizationExemption(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!isBatteryOptimizationDisabled(context)) {
                Log.w(TAG, "Battery optimization enabled - requesting exemption");

                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);

                    Log.d(TAG, "✓ Opened battery optimization settings");
                } catch (Exception e) {
                    Log.e(TAG, "✗ Failed to open battery optimization settings", e);

                    // Fallback: Open general battery optimization settings
                    try {
                        Intent fallbackIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(fallbackIntent);
                        Log.d(TAG, "✓ Opened general battery settings");
                    } catch (Exception e2) {
                        Log.e(TAG, "✗ Failed to open any battery settings", e2);
                    }
                }
            } else {
                Log.d(TAG, "✓ Battery optimization already disabled");
            }
        }
    }

    /**
     * Check all permissions needed for reliable alarms
     * Returns true if all permissions granted
     */
    /**
     * Check if notification permission is granted (Android 13+)
     * Without this, foreground service notifications won't show
     */
    public static boolean hasNotificationPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            boolean enabled = nm != null && nm.areNotificationsEnabled();
            Log.d(TAG, "Notification permission: " + enabled);
            return enabled;
        }
        return true;
    }

    public static boolean hasAllAlarmPermissions(Context context) {
        boolean exactAlarmOk = canScheduleExactAlarms(context);
        boolean batteryOk = isBatteryOptimizationDisabled(context);
        boolean notifOk = hasNotificationPermission(context);

        Log.d(TAG, "════════════════════════════════════════");
        Log.d(TAG, "Alarm Permission Status:");
        Log.d(TAG, "  Exact Alarm:   " + (exactAlarmOk ? "✓ OK" : "✗ MISSING"));
        Log.d(TAG, "  Battery Opt:   " + (batteryOk ? "✓ DISABLED" : "✗ ENABLED (may kill alarms)"));
        Log.d(TAG, "  Notifications: " + (notifOk ? "✓ OK" : "✗ MISSING (alarm UI won't show)"));
        Log.d(TAG, "════════════════════════════════════════");

        return exactAlarmOk && batteryOk && notifOk;
    }

    /**
     * Request all critical alarm permissions
     * Call this when user schedules first alarm
     */
    public static void ensureAllAlarmPermissions(Context context) {
        Log.d(TAG, "Ensuring all alarm permissions...");

        // Request exact alarm permission (Android 12+)
        requestExactAlarmPermission(context);

        // Request battery optimization exemption
        requestBatteryOptimizationExemption(context);

        Log.d(TAG, "Permission requests completed");
    }

    /**
     * Get user-friendly message explaining why permissions are needed
     */
    public static String getPermissionExplanation(Context context) {
        StringBuilder message = new StringBuilder();

        if (!canScheduleExactAlarms(context)) {
            message.append("⏰ Exact Alarm Permission:\n");
            message.append("Needed to trigger alarms at exact time.\n\n");
        }

        if (!isBatteryOptimizationDisabled(context)) {
            message.append("🔋 Battery Optimization:\n");
            message.append("Disable to ensure alarms work when app is closed.\n\n");
        }

        if (!hasNotificationPermission(context)) {
            message.append("🔔 Notification Permission:\n");
            message.append("Required to show alarm screen and notifications.\n\n");
        }

        if (message.length() == 0) {
            return "All permissions granted! Alarms will work reliably.";
        }

        message.append("⚠️ Without these, alarms may NOT ring when app is closed!");
        return message.toString();
    }
}
