import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mypa.app',
  appName: 'MyPA',
  webDir: 'dist/public',
  // REMOVED server.url - App will load from bundled files (capacitor://localhost)
  // This fixes cookie issues because capacitor:// is treated as HTTPS secure context
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#002E6E",
      sound: "beep.wav"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#002E6E",
      showSpinner: false
    },
    StatusBar: {
      backgroundColor: "#002E6E"
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
