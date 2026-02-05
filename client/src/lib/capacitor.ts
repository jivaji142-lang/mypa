import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { initializeNativeNotifications, syncAllAlarms, AlarmData } from './nativeNotifications';

export async function initializeCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Capacitor] Running in web mode');
    return;
  }

  console.log('[Capacitor] Initializing native app...');

  try {
    await StatusBar.setBackgroundColor({ color: '#002E6E' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (e) {
    console.log('[Capacitor] StatusBar not available');
  }

  try {
    await initializeNativeNotifications();
  } catch (e) {
    console.error('[Capacitor] Failed to initialize notifications:', e);
  }

  try {
    await SplashScreen.hide();
  } catch (e) {
    console.log('[Capacitor] SplashScreen not available');
  }

  console.log('[Capacitor] Native app initialized');
}

export async function syncAlarmsToNative(alarms: any[], medicines: any[], meetings: any[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const allAlarms: AlarmData[] = [];

  for (const alarm of alarms) {
    if (alarm.isActive) {
      allAlarms.push({
        id: alarm.id,
        title: alarm.title || 'Alarm',
        body: alarm.textToSpeak || `${alarm.title} - Time!`,
        time: alarm.time,
        days: alarm.days,
        date: alarm.date,
        type: 'alarm'
      });
    }
  }

  for (const medicine of medicines) {
    if (medicine.isActive && medicine.times) {
      for (let i = 0; i < medicine.times.length; i++) {
        allAlarms.push({
          id: medicine.id * 1000 + i,
          title: `Medicine: ${medicine.name}`,
          body: medicine.textToSpeak || `Time to take ${medicine.name}`,
          time: medicine.times[i],
          type: 'medicine'
        });
      }
    }
  }

  for (const meeting of meetings) {
    if (meeting.enabled) {
      allAlarms.push({
        id: meeting.id * 10000,
        title: `Meeting: ${meeting.title}`,
        body: meeting.textToSpeak || `${meeting.title}${meeting.location ? ` at ${meeting.location}` : ''}`,
        time: meeting.time,
        date: meeting.date,
        type: 'meeting'
      });
    }
  }

  await syncAllAlarms(allAlarms);
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
