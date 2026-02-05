import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface AlarmData {
  id: number;
  title: string;
  body: string;
  time: string;
  days?: string[];
  date?: string;
  type: 'alarm' | 'medicine' | 'meeting';
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (period) {
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
  }
  
  return { hours, minutes };
}

function getNextOccurrence(hours: number, minutes: number, days?: string[], specificDate?: string): Date {
  const now = new Date();
  
  if (specificDate) {
    const [year, month, day] = specificDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0);
    return date;
  }
  
  if (days && days.length > 0) {
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    
    const currentDay = now.getDay();
    let minDaysUntil = 7;
    
    for (const day of days) {
      const targetDay = dayMap[day];
      let daysUntil = targetDay - currentDay;
      
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0) {
        const todayTime = new Date(now);
        todayTime.setHours(hours, minutes, 0, 0);
        if (todayTime > now) {
          return todayTime;
        }
        daysUntil = 7;
      }
      
      if (daysUntil < minDaysUntil) {
        minDaysUntil = daysUntil;
      }
    }
    
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + minDaysUntil);
    nextDate.setHours(hours, minutes, 0, 0);
    return nextDate;
  }
  
  const todayTime = new Date(now);
  todayTime.setHours(hours, minutes, 0, 0);
  
  if (todayTime > now) {
    return todayTime;
  }
  
  todayTime.setDate(todayTime.getDate() + 1);
  return todayTime;
}

export async function isNativeApp(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!await isNativeApp()) return false;
  
  const permission = await LocalNotifications.requestPermissions();
  return permission.display === 'granted';
}

export async function scheduleNativeAlarm(alarm: AlarmData): Promise<boolean> {
  if (!await isNativeApp()) return false;
  
  try {
    const { hours, minutes } = parseTime(alarm.time);
    const scheduleDate = getNextOccurrence(hours, minutes, alarm.days, alarm.date);
    
    const notification: LocalNotificationSchema = {
      id: alarm.id,
      title: alarm.title,
      body: alarm.body,
      schedule: {
        at: scheduleDate,
        allowWhileIdle: true
      },
      sound: 'beep.wav',
      smallIcon: 'ic_stat_icon',
      iconColor: '#002E6E',
      ongoing: false,
      autoCancel: true,
      extra: {
        type: alarm.type,
        alarmId: alarm.id
      }
    };

    if (alarm.days && alarm.days.length > 0) {
      const dayMap: Record<string, 1|2|3|4|5|6|7> = {
        'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6, 'Sat': 7
      };
      
      for (const day of alarm.days) {
        const notificationId = alarm.id * 10 + dayMap[day];
        const daySchedule = getNextOccurrence(hours, minutes, [day]);
        
        await LocalNotifications.schedule({
          notifications: [{
            ...notification,
            id: notificationId,
            schedule: {
              at: daySchedule,
              allowWhileIdle: true,
              repeats: true,
              every: 'week'
            }
          }]
        });
      }
    } else {
      await LocalNotifications.schedule({
        notifications: [notification]
      });
    }
    
    console.log(`[Native] Scheduled alarm ${alarm.id} for ${scheduleDate.toLocaleString()}`);
    return true;
  } catch (error) {
    console.error('[Native] Failed to schedule alarm:', error);
    return false;
  }
}

export async function cancelNativeAlarm(alarmId: number): Promise<void> {
  if (!await isNativeApp()) return;
  
  try {
    const idsToCancel = [alarmId];
    for (let i = 1; i <= 7; i++) {
      idsToCancel.push(alarmId * 10 + i);
    }
    
    await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });
    console.log(`[Native] Cancelled alarm ${alarmId}`);
  } catch (error) {
    console.error('[Native] Failed to cancel alarm:', error);
  }
}

export async function syncAllAlarms(alarms: AlarmData[]): Promise<void> {
  if (!await isNativeApp()) return;
  
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    
    for (const alarm of alarms) {
      await scheduleNativeAlarm(alarm);
    }
    
    console.log(`[Native] Synced ${alarms.length} alarms`);
  } catch (error) {
    console.error('[Native] Failed to sync alarms:', error);
  }
}

export async function initializeNativeNotifications(): Promise<void> {
  if (!await isNativeApp()) return;
  
  await requestNotificationPermission();
  
  LocalNotifications.addListener('localNotificationReceived', (notification) => {
    console.log('[Native] Notification received:', notification);
  });
  
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('[Native] Notification action:', action);
    if (action.actionId === 'tap') {
      window.location.href = '/';
    }
  });
}
