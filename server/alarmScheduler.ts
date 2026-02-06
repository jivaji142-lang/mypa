import { db } from './db';
import { alarms, medicines, meetings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendPushNotification } from './pushNotification';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastCheckedMinute: string = '';

function getCurrentTimeIST(): { time: string; day: string; date: string; minutes: number } {
  // Use Intl.DateTimeFormat for reliable IST conversion
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const parts = formatter.formatToParts(now);
  
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const hours = getValue('hour').padStart(2, '0');
  const minutes = getValue('minute').padStart(2, '0');
  const time = `${hours}:${minutes}`;
  
  // Map weekday to short form
  const weekdayMap: Record<string, string> = {
    'Sun': 'Sun', 'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed',
    'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat'
  };
  const day = weekdayMap[getValue('weekday')] || getValue('weekday');
  
  const year = getValue('year');
  const month = getValue('month').padStart(2, '0');
  const dateNum = getValue('day').padStart(2, '0');
  const date = `${year}-${month}-${dateNum}`;
  
  return { time, day, date, minutes: parseInt(minutes) };
}

function timeMatches(alarmTime: string, currentTime: string): boolean {
  // Compare HH:mm format
  const alarmHHMM = alarmTime.substring(0, 5);
  return alarmHHMM === currentTime;
}

async function checkAndSendAlarms() {
  const { time, day, date } = getCurrentTimeIST();
  
  // Avoid checking same minute twice
  const minuteKey = `${date}-${time}`;
  if (minuteKey === lastCheckedMinute) {
    return;
  }
  lastCheckedMinute = minuteKey;
  
  console.log(`[Scheduler] Checking alarms at ${time} on ${day} (${date})`);

  try {
    // Get all active alarms
    const activeAlarms = await db
      .select()
      .from(alarms)
      .where(eq(alarms.isActive, true));

    for (const alarm of activeAlarms) {
      let shouldTrigger = false;

      if (timeMatches(alarm.time, time)) {
        // Check if specific date alarm
        if (alarm.date) {
          shouldTrigger = alarm.date === date;
        }
        // Check if recurring alarm
        else if (alarm.days && alarm.days.length > 0) {
          shouldTrigger = alarm.days.includes(day);
        }
        // One-time alarm without date
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
          textToSpeak: alarm.textToSpeak || undefined,
          alarmType: alarm.type || 'speaking',
          voiceUrl: alarm.voiceUrl || undefined,
          imageUrl: alarm.imageUrl || undefined,
          language: alarm.language || 'english',
          days: alarm.days || undefined,
          duration: alarm.duration || 30,
          loop: alarm.loop !== false,
          voiceGender: alarm.voiceGender || 'female',
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
          if (timeMatches(medTime, time)) {
            console.log(`[Scheduler] Triggering medicine ${medicine.id}: ${medicine.name}`);
            
            await sendPushNotification(medicine.userId, {
              title: `Medicine: ${medicine.name}`,
              body: medicine.textToSpeak || `Time to take ${medicine.name}${medicine.dosage ? ` - ${medicine.dosage}` : ''}`,
              type: 'medicine',
              id: medicine.id,
              textToSpeak: medicine.textToSpeak || undefined,
              alarmType: medicine.type || 'speaking',
              voiceUrl: medicine.voiceUrl || undefined,
              imageUrl: medicine.photoUrl || undefined,
              photoUrl: medicine.photoUrl || undefined,
              dosage: medicine.dosage || undefined,
              language: medicine.language || 'english',
              duration: medicine.duration || 30,
              loop: medicine.loop !== false,
              voiceGender: medicine.voiceGender || 'female',
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
      if (timeMatches(meeting.time, time) && meeting.date === date) {
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
  
  // Check every 30 seconds for better accuracy
  schedulerInterval = setInterval(checkAndSendAlarms, 30 * 1000);
  
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
