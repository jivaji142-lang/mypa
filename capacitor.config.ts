import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mypa.app',
  appName: 'MyPA',
  webDir: 'dist/public',
  server: {
    url: 'https://1e19c106-01bc-42d8-881c-29ebe24b935a-00-3bs057jl7dfu2.riker.replit.dev',
    androidScheme: 'https',
    cleartext: true
  },
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
