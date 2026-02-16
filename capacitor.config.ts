import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mypa.app',
  appName: 'MyPA',
  webDir: 'dist/public',
  // Server URL removed - app loads from bundled files
  // API calls go to: https://mypa-liard.vercel.app (defined in client/src/lib/config.ts)
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
