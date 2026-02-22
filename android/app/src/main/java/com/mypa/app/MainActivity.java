package com.mypa.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/**
 * MainActivity - Main entry point for the app
 *
 * Registers custom Capacitor plugins and handles normal app launches
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int REQUEST_NOTIFICATION_PERMISSION = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "MainActivity onCreate - registering plugins");

        // Register custom plugins BEFORE calling super.onCreate()
        registerPlugin(FullScreenAlarmPlugin.class);
        registerPlugin(AlarmPermissionsPlugin.class);

        super.onCreate(savedInstanceState);

        Log.d(TAG, "MainActivity onCreate complete - Plugins registered");

        // CRITICAL: Enable cookies for cross-origin API authentication
        enableWebViewCookies();

        // CRITICAL: Request POST_NOTIFICATIONS permission (Android 13+)
        // Without this, foreground service notifications won't show
        requestNotificationPermission();

        // CRITICAL: Request alarm permissions on first launch
        // This ensures alarms work when app is killed
        AlarmPermissionHelper.ensureAllAlarmPermissions(this);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Requesting POST_NOTIFICATIONS permission...");
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        REQUEST_NOTIFICATION_PERMISSION);
            } else {
                Log.d(TAG, "POST_NOTIFICATIONS permission already granted");
            }
        }
    }

    /**
     * Enable cookies in WebView for session authentication
     * CRITICAL for cross-origin API calls to work
     */
    private void enableWebViewCookies() {
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);

            // CRITICAL: Enable third-party cookies for cross-origin requests
            // Required for mobile app (http://10.x.x.x) to API (https://vercel.app)
            if (this.bridge != null && this.bridge.getWebView() != null) {
                cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
                Log.d(TAG, "✓ WebView cookies enabled (including third-party)");
            } else {
                Log.w(TAG, "⚠ WebView not available yet, cookies will be enabled later");
            }
        } catch (Exception e) {
            Log.e(TAG, "✗ Failed to enable WebView cookies: " + e.getMessage());
        }
    }
}
