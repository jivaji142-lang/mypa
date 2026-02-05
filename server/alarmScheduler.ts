import { db } from './db';
import { alarms, medicines, meetings, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { sendPushNotification } from './pushNotification';

let schedulerInterval: NodeJS.Timeout | null = null;

function getCurrentTimeIST(): { time: string; day: string; date: string } {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[istTime.getUTCDay()];
  
  const year = istTime.getUTCFullYear();
  const month = (istTime.getUTCMonth() + 1).toString().padStart(2, '0');
  const dateNum = istTime.getUTCDate().toString().padStart(2, '0');
  const date = `${year}-${month}-${dateNum}`;
  
  return { time, day, date };
}

async function checkAndSendAlarms() {
  const { time, day, date } = getCurrentTimeIST();
  console.log(`[Scheduler] Checking alarms at ${time} on ${day} (${date})`);

  try {
    // Get all active alarms
    const activeAlarms = await db
      .select()
      .from(alarms)
      .where(eq(alarms.isActive, true));

    for (const alarm of activeAlarms) {
      let shouldTrigger = false;

      // Check time match (compare just HH:mm)
      const alarmTime = alarm.time.substring(0, 5); // Get HH:mm
      if (alarmTime === time) {
        // Check if specific date alarm
        if (alarm.date) {
          shouldTrigger = alarm.date === date;
        }
        // Check if recurring alarm
        else if (alarm.days && alarm.days.length > 0) {
          shouldTrigger = alarm.days.includes(day);
        }
        // One-time alarm without date (shouldn't happen, but handle it)
        else {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        console.log(`[Scheduler] Triggering alarm ${alarm.id}: ${alarm.title}`);
        
        await sendPushNotification(alarm.userId, {
          title: alarm.title || 'MyPA Alarm',
          body: alarm.textToSpeak || `${alarm.title} - Time to wake up!`,
          type: 'alarm',
          id: alarm.id,
          textToSpeak: alarm.textToSpeak || undefined
        });
      }
    }

    // Check medicines
    const activeMedicines = await db
      .select()
      .from(medicines)
      .where(eq(medicines.isActive, true));

    for (const medicine of activeMedicines) {
      if (medicine.times && medicine.times.length > 0) {
        for (const medTime of medicine.times) {
          const medTimeHHMM = medTime.substring(0, 5);
          if (medTimeHHMM === time) {
            console.log(`[Scheduler] Triggering medicine ${medicine.id}: ${medicine.name}`);
            
            await sendPushNotification(medicine.userId, {
              title: `Medicine: ${medicine.name}`,
              body: medicine.textToSpeak || `Time to take ${medicine.name}${medicine.dosage ? ` - ${medicine.dosage}` : ''}`,
              type: 'medicine',
              id: medicine.id,
              textToSpeak: medicine.textToSpeak || undefined
            });
          }
        }
      }
    }

    // Check meetings
    const activeMeetings = await db
      .select()
      .from(meetings)
      .where(eq(meetings.enabled, true));

    for (const meeting of activeMeetings) {
      const meetingTime = meeting.time.substring(0, 5);
      if (meetingTime === time && meeting.date === date) {
        console.log(`[Scheduler] Triggering meeting ${meeting.id}: ${meeting.title}`);
        
        await sendPushNotification(meeting.userId, {
          title: `Meeting: ${meeting.title}`,
          body: meeting.textToSpeak || `${meeting.title}${meeting.location ? ` at ${meeting.location}` : ''}`,
          type: 'meeting',
          id: meeting.id,
          textToSpeak: meeting.textToSpeak || undefined
        });
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error checking alarms:', error);
  }
}

export function startAlarmScheduler() {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting alarm scheduler...');
  
  // Check every minute
  schedulerInterval = setInterval(checkAndSendAlarms, 60 * 1000);
  
  // Also run immediately
  checkAndSendAlarms();
}

export function stopAlarmScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}
