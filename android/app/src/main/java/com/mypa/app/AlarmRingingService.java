package com.mypa.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class AlarmRingingService extends Service {
    private static final String TAG = "AlarmRingingService";
    private static final String CHANNEL_ID = "ALARM_CHANNEL_HIGH";
    private static final String CHANNEL_NAME = "Alarms";
    private static final int NOTIFICATION_ID = 9999;

    public static final String ACTION_DISMISS = "DISMISS";
    public static final String ACTION_SNOOZE = "SNOOZE";

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private int alarmId;
    private String alarmTitle;
    private String alarmBody;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "════════════════════════════════════════");
        Log.d(TAG, "✓ SERVICE CREATED");
        Log.d(TAG, "════════════════════════════════════════");
        acquireWakeLock();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "✓ SERVICE STARTED");

        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            Log.d(TAG, "Action: " + action);

            if (ACTION_DISMISS.equals(action)) {
                dismissAlarm();
                return START_NOT_STICKY;
            } else if (ACTION_SNOOZE.equals(action)) {
                snoozeAlarm();
                return START_NOT_STICKY;
            }
        }

        if (intent != null) {
            alarmId = intent.getIntExtra("alarm_id", -1);
            alarmTitle = intent.getStringExtra("alarm_title");
            alarmBody = intent.getStringExtra("alarm_body");

            if (alarmTitle == null) alarmTitle = "Alarm";
            if (alarmBody == null) alarmBody = "";

            Log.d(TAG, "Alarm: " + alarmTitle);
        }

        // CRITICAL: Start foreground IMMEDIATELY
        try {
            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);
            Log.d(TAG, "✓ NOTIFICATION POSTED (startForeground)");
        } catch (Exception e) {
            Log.e(TAG, "✗ FAILED to start foreground!", e);
            // Fallback: launch AlarmActivity directly even without notification
            launchAlarmActivityDirectly();
        }

        // Also launch AlarmActivity directly for maximum reliability
        // This ensures alarm screen shows even if notification permission is missing
        launchAlarmActivityDirectly();

        // Play sound
        playAlarmSound();

        // Start vibration
        startVibration();

        Log.d(TAG, "✓ ALARM RINGING!");
        Log.d(TAG, "════════════════════════════════════════");

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Critical alarm notifications");
                    channel.enableLights(true);
                    channel.enableVibration(false); // We handle vibration in service
                    channel.setBypassDnd(true);
                    channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                    // CRITICAL FIX: Use default alarm sound for notification
                    // This ensures notification shows even when screen is off
                    AudioAttributes audioAttr = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .build();
                    Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    if (alarmSound == null) {
                        alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                    }
                    channel.setSound(alarmSound, audioAttr);

                    nm.createNotificationChannel(channel);
                    Log.d(TAG, "✓ Notification channel created with alarm sound");
                }
            } catch (Exception e) {
                Log.e(TAG, "✗ Channel creation failed", e);
            }
        }
    }

    private Notification buildNotification() {
        SimpleDateFormat fmt = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        String time = fmt.format(new Date());

        String title = alarmTitle;
        String text = time;
        if (alarmBody != null && !alarmBody.isEmpty()) {
            text += " • " + alarmBody;
        }

        // ═══════════════════════════════════════════════════════════════
        // FULL-SCREEN INTENT: Shows AlarmActivity like alarm clock UI
        // ═══════════════════════════════════════════════════════════════
        // This is OUR custom UI, NOT system Clock app
        // Appears as full-screen overlay (like alarm-style notification)
        // ═══════════════════════════════════════════════════════════════
        Intent openIntent = new Intent(this, AlarmActivity.class);
        openIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION  // Prevents user interaction during launch
        );
        openIntent.putExtra("alarm_id", alarmId);
        openIntent.putExtra("alarm_title", alarmTitle);
        openIntent.putExtra("alarm_body", alarmBody);

        PendingIntent openPending = PendingIntent.getActivity(
            this, alarmId, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Dismiss action
        Intent dismissIntent = new Intent(this, AlarmRingingService.class);
        dismissIntent.setAction(ACTION_DISMISS);
        PendingIntent dismissPending = PendingIntent.getService(
            this, alarmId + 1000, dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Snooze action
        Intent snoozeIntent = new Intent(this, AlarmRingingService.class);
        snoozeIntent.setAction(ACTION_SNOOZE);
        PendingIntent snoozePending = PendingIntent.getService(
            this, alarmId + 2000, snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // ═══════════════════════════════════════════════════════════════
        // BUILD ALARM-STYLE NOTIFICATION (App-Owned, NOT System Clock)
        // ═══════════════════════════════════════════════════════════════
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)  // Alarm category, but app-controlled
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openPending)
            .addAction(0, "Dismiss", dismissPending)
            .addAction(0, "Snooze", snoozePending);

        // CRITICAL: setFullScreenIntent shows OUR activity, not system Clock
        // This creates alarm-like experience WITHOUT triggering system UI
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setFullScreenIntent(openPending, true);
        }

        Log.d(TAG, "✓ Notification built (app-owned alarm UI): " + title);
        return builder.build();
    }

    private void launchAlarmActivityDirectly() {
        try {
            Intent activityIntent = new Intent(this, AlarmActivity.class);
            activityIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            );
            activityIntent.putExtra("alarm_id", alarmId);
            activityIntent.putExtra("alarm_title", alarmTitle);
            activityIntent.putExtra("alarm_body", alarmBody);
            startActivity(activityIntent);
            Log.d(TAG, "✓ AlarmActivity launched directly");
        } catch (Exception e) {
            Log.e(TAG, "✗ Failed to launch AlarmActivity directly", e);
        }
    }

    private void playAlarmSound() {
        try {
            Log.d(TAG, "Starting sound...");

            if (mediaPlayer != null) {
                mediaPlayer.release();
            }

            Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (uri == null) {
                uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            if (uri == null) {
                Log.e(TAG, "No sound URI!");
                return;
            }

            mediaPlayer = new MediaPlayer();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes attr = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
                mediaPlayer.setAudioAttributes(attr);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setDataSource(this, uri);
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.prepare();
            mediaPlayer.start();

            Log.d(TAG, "✓ Sound playing!");
        } catch (Exception e) {
            Log.e(TAG, "✗ Sound failed", e);
        }
    }

    private void startVibration() {
        try {
            Log.d(TAG, "Starting vibration...");

            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) {
                Log.w(TAG, "No vibrator available");
                return;
            }

            // Check vibration permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (checkSelfPermission(android.Manifest.permission.VIBRATE) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "No VIBRATE permission");
                    return;
                }
            }

            long[] pattern = {0, 500, 500, 500, 500, 500, 500};

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
                vibrator.vibrate(effect);
            } else {
                vibrator.vibrate(pattern, 0);
            }

            Log.d(TAG, "✓ Vibration started!");
        } catch (Exception e) {
            Log.e(TAG, "✗ Vibration failed", e);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                // CRITICAL FIX: Use FULL_WAKE_LOCK to ensure notification shows
                // PARTIAL_WAKE_LOCK doesn't wake screen, causing notification suppression
                wakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "AlarmApp:ServiceWakeLock"
                );
                // Auto-release after 10 minutes (safety measure)
                wakeLock.acquire(10 * 60 * 1000L);
                Log.d(TAG, "✓ Full wake lock acquired (screen will turn on)");
            }
        } catch (Exception e) {
            Log.e(TAG, "✗ Wake lock failed", e);
        }
    }

    private void dismissAlarm() {
        Log.d(TAG, "✓ ALARM DISMISSED");
        stopAlarmSound();
        stopVibration();
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    private void snoozeAlarm() {
        Log.d(TAG, "✓ ALARM SNOOZED - Scheduling for 5 minutes later");

        // CRITICAL FIX: Use helper class to re-schedule alarm
        // This prevents triggering system Clock app
        boolean success = AlarmSchedulerHelper.scheduleSnoozeAlarm(
            this,
            alarmId,
            alarmTitle,
            alarmBody
        );

        if (success) {
            Log.d(TAG, "✓ Snooze alarm scheduled successfully");
        } else {
            Log.e(TAG, "✗ Failed to schedule snooze alarm");
        }

        // Stop current alarm
        stopAlarmSound();
        stopVibration();
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    private void stopAlarmSound() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "Sound stopped");
            } catch (Exception e) {
                Log.e(TAG, "Stop sound failed", e);
            }
        }
    }

    private void stopVibration() {
        if (vibrator != null) {
            try {
                vibrator.cancel();
                vibrator = null;
                Log.d(TAG, "Vibration stopped");
            } catch (Exception e) {
                Log.e(TAG, "Stop vibration failed", e);
            }
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                wakeLock = null;
                Log.d(TAG, "Wake lock released");
            } catch (Exception e) {
                Log.e(TAG, "Wake lock release failed", e);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "✓ SERVICE DESTROYED");
        stopAlarmSound();
        stopVibration();
        releaseWakeLock();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
