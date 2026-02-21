import { useEffect, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useAlarms, useUpdateAlarm } from "@/hooks/use-alarms";
import { useMedicines } from "@/hooks/use-medicines";
import { useTranslations } from "@/hooks/use-translations";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, Users, X } from "lucide-react";
import { createPortal } from "react-dom";
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  location?: string;
  textToSpeak?: string;
  enabled: boolean;
}

interface ActiveAlarmData {
  id: number;
  type: 'alarm' | 'medicine' | 'meeting';
  alarmType?: string;
  title: string;
  message: string;
  imageUrl?: string;
  voiceUrl?: string;
  audio?: HTMLAudioElement;
  language?: string;
  isDateAlarm?: boolean; // true if this alarm was triggered by a date match (one-time)
}

const langMap: Record<string, string> = {
  english: 'en-US', hindi: 'hi-IN', marathi: 'mr-IN', spanish: 'es-ES',
  french: 'fr-FR', german: 'de-DE', chinese: 'zh-CN', japanese: 'ja-JP',
  arabic: 'ar-SA', russian: 'ru-RU', portuguese: 'pt-PT', bengali: 'bn-IN',
  telugu: 'te-IN', tamil: 'ta-IN', gujarati: 'gu-IN', kannada: 'kn-IN',
  malayalam: 'ml-IN', punjabi: 'pa-IN'
};

export function GlobalAlarmHandler() {
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL FIX: Disable GlobalAlarmHandler on Native Android
  // ═══════════════════════════════════════════════════════════════
  // PROBLEM:
  // - Native Android has AlarmActivity (native Java UI)
  // - Web/PWA has GlobalAlarmHandler (React component UI)
  // - Both were showing simultaneously (double UI bug!)
  //
  // SOLUTION:
  // - On native platform: Use native AlarmActivity ONLY
  // - On web platform: Use GlobalAlarmHandler ONLY
  // ═══════════════════════════════════════════════════════════════

  const isNativePlatform = Capacitor.isNativePlatform();

  // Disable on native Android/iOS - use native alarm UI instead
  if (isNativePlatform) {
    console.log('[GlobalAlarmHandler] Running on native platform - DISABLED (using native AlarmActivity instead)');
    return null;
  }

  console.log('[GlobalAlarmHandler] Running on web platform - ENABLED');

  const { user } = useAuth();
  const { data: alarms } = useAlarms();
  const { data: medicines } = useMedicines();
  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ['/api/meetings'],
    enabled: !!user,
    refetchInterval: 60000,
  });
  const updateAlarm = useUpdateAlarm();
  const t = useTranslations();

  const [activeAlarms, setActiveAlarms] = useState<Set<number>>(new Set());
  const [activeMeds, setActiveMeds] = useState<Set<number>>(new Set());
  const [activeMeetings, setActiveMeetings] = useState<Set<number>>(new Set());
  const [dismissedAlarms, setDismissedAlarms] = useState<Map<number, string>>(new Map());
  const [dismissedMeds, setDismissedMeds] = useState<Map<number, string>>(new Map());
  const [dismissedMeetings, setDismissedMeetings] = useState<Map<number, string>>(new Map());
  const [activeAlarmPopup, setActiveAlarmPopup] = useState<ActiveAlarmData | null>(null);
  const [snoozeTimeout, setSnoozeTimeout] = useState<NodeJS.Timeout | null>(null);
  const vibrateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Create fallback beep sound using Web Audio API
  const playFallbackBeep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('[GlobalAlarm] Web Audio API not available');
        return;
      }

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz beep
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5); // 500ms beep

      // Loop the beep
      const beepInterval = setInterval(() => {
        if (!isSpeakingRef.current) {
          clearInterval(beepInterval);
          return;
        }

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.5);
      }, 1000);

      // Store interval for cleanup
      setTimeout(() => clearInterval(beepInterval), 30000); // Max 30 seconds
    } catch (error) {
      console.error('[GlobalAlarm] Failed to play fallback beep:', error);
    }
  }, []);

  const speakTTS = useCallback(async (textToSpeak: string, language: string, voiceGender: string, shouldLoop: boolean) => {
    isSpeakingRef.current = true;
    let ttsWorked = false;

    const speak = async () => {
      if (!isSpeakingRef.current) return;

      try {
        // Try native TTS first (for mobile)
        await TextToSpeech.speak({
          text: textToSpeak,
          lang: langMap[language] || 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'playback',
        });

        ttsWorked = true;

        // If looping is enabled and still speaking, repeat
        if (shouldLoop && isSpeakingRef.current) {
          setTimeout(() => speak(), 500);
        }
      } catch (error) {
        console.warn('[GlobalAlarm] Native TTS failed, trying web API:', error);

        // Fallback to web speechSynthesis API
        if (window.speechSynthesis) {
          try {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = langMap[language] || 'en-US';

            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)) && v.name.includes(voiceGender === 'male' ? 'Male' : 'Female')) ||
                              voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));

            if (preferred) utterance.voice = preferred;

            utterance.onend = () => {
              if (shouldLoop && isSpeakingRef.current) {
                setTimeout(() => speak(), 500);
              }
            };

            utterance.onerror = () => {
              if (!ttsWorked) {
                console.warn('[GlobalAlarm] Web TTS also failed, using fallback beep');
                playFallbackBeep();
              }
            };

            window.speechSynthesis.speak(utterance);
            ttsWorked = true;
          } catch (e) {
            console.error('[GlobalAlarm] Web TTS error:', e);
            if (!ttsWorked) {
              playFallbackBeep();
            }
          }
        } else {
          console.error('[GlobalAlarm] No TTS API available, using fallback beep');
          playFallbackBeep();
        }
      }
    };

    // Stop any existing speech
    try {
      await TextToSpeech.stop();
    } catch (e) {
      // Ignore errors
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    speak();
  }, [playFallbackBeep]);

  const triggerAlarm = useCallback((item: any, type: 'alarm' | 'medicine' | 'meeting', isDateAlarm?: boolean) => {
    console.log(`[GlobalAlarm] Triggering ${type}:`, item.id, isDateAlarm ? '(date-based, one-time)' : '');
    const duration = (item.duration || 30) * 1000;
    const shouldLoop = item.loop !== false;
    let audio: HTMLAudioElement | undefined;

    const message = item.textToSpeak || item.title || (type === 'medicine' ? `Time for medicine: ${item.name}` : type === 'meeting' ? `Meeting: ${item.title}${item.location ? ` at ${item.location}` : ''}` : 'Alarm');

    setActiveAlarmPopup({
      id: item.id,
      type,
      alarmType: item.type || 'speaking',
      title: item.title || item.name || 'Alarm',
      message,
      imageUrl: item.imageUrl || item.photoUrl,
      voiceUrl: item.voiceUrl,
      language: item.language || user?.language || 'english',
      isDateAlarm: isDateAlarm || false,
    });

    if (item.type === "vibration") {
      if ('vibrate' in navigator) {
        const vibratePattern = () => {
          navigator.vibrate([500, 200, 500, 200, 500]);
        };
        vibratePattern();
        if (vibrateIntervalRef.current) clearInterval(vibrateIntervalRef.current);
        vibrateIntervalRef.current = setInterval(vibratePattern, 2000);
        setTimeout(() => {
          if (vibrateIntervalRef.current) {
            clearInterval(vibrateIntervalRef.current);
            vibrateIntervalRef.current = null;
          }
        }, duration);
      }
    } else if ((item.type === "custom_voice" || item.type === "music") && item.voiceUrl) {
      audio = new Audio(item.voiceUrl);
      audio.loop = shouldLoop;
      audio.volume = 1.0;

      // Attempt to play immediately
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("[GlobalAlarm] Audio autoplay blocked, trying with user interaction:", err);
          // Fallback to TTS if audio fails
          const ttsText = item.textToSpeak || item.title || item.name || t.alarm;
          speakTTS(ttsText, item.language || user?.language || 'english', item.voiceGender || 'female', shouldLoop);
        });
      }

      setActiveAlarmPopup(prev => prev ? { ...prev, audio } : null);

      setTimeout(() => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      }, duration);
    } else if (item.textToSpeak || type === 'medicine' || item.type === 'speaking') {
      const msg = item.textToSpeak || (type === 'medicine' ? `${t.timeForMedicine}: ${item.name}` : item.title || t.alarm);
      if (msg) {
        speakTTS(msg, item.language || user?.language || 'english', item.voiceGender || 'female', shouldLoop);
        setTimeout(async () => {
          try {
            await TextToSpeech.stop();
          } catch (e) {
            // Ignore
          }
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        }, duration);
      }
    }
  }, [user, speakTTS, t]);

  const triggerFromPushData = useCallback((data: any) => {
    console.log('[GlobalAlarm] Triggering from push data:', data);
    const isMedicine = data.type === 'medicine';
    const isMeeting = data.type === 'meeting';
    const medDosage = data.dosage ? ` (${data.dosage})` : '';
    const medName = data.title || t.medicine;
    const defaultMedText = `${t.timeForMedicine}: ${medName}${medDosage}`;
    
    const item = {
      id: data.id || data.alarmId || 0,
      title: data.title || (isMeeting ? t.myMeetings : isMedicine ? t.medicineReminder : t.alarm),
      name: data.title || (isMedicine ? t.medicine : t.alarm),
      textToSpeak: data.textToSpeak || data.body || (isMedicine ? defaultMedText : isMeeting ? `Meeting: ${data.title}` : undefined),
      type: data.alarmType || 'speaking',
      voiceUrl: data.voiceUrl,
      imageUrl: data.imageUrl || data.photoUrl,
      photoUrl: data.photoUrl,
      location: data.location,
      language: data.language || 'english',
      duration: data.duration || 30,
      loop: data.loop !== false,
      voiceGender: data.voiceGender || 'female',
    };
    const alarmKind: 'alarm' | 'medicine' | 'meeting' = isMeeting ? 'meeting' : isMedicine ? 'medicine' : 'alarm';
    triggerAlarm(item, alarmKind);
  }, [triggerAlarm, t]);

  const isProcessingRef = useRef(false);

  const dismissAlarm = useCallback(async () => {
    // Guard against double invocation (touch + click race condition)
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    isSpeakingRef.current = false;

    // Stop native TTS
    try {
      await TextToSpeech.stop();
    } catch (e) {
      // Ignore errors
    }

    // Stop web TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0);

    if (activeAlarmPopup) {
      if (activeAlarmPopup.audio) {
        activeAlarmPopup.audio.pause();
        activeAlarmPopup.audio.src = "";
      }

      const currentTime = format(new Date(), "HH:mm");

      if (activeAlarmPopup.type === 'alarm') {
        setActiveAlarms(prev => {
          const next = new Set(prev);
          next.delete(activeAlarmPopup.id);
          return next;
        });
        setDismissedAlarms(prev => {
          const next = new Map(prev);
          next.set(activeAlarmPopup.id, currentTime);
          return next;
        });
        // Deactivate date-based (one-time) alarms only when user explicitly dismisses
        if (activeAlarmPopup.isDateAlarm) {
          console.log(`[GlobalAlarm] Deactivating date-based alarm ${activeAlarmPopup.id} on dismiss`);
          updateAlarm.mutate({ id: activeAlarmPopup.id, isActive: false });
        }
      } else if (activeAlarmPopup.type === 'meeting') {
        setActiveMeetings(prev => {
          const next = new Set(prev);
          next.delete(activeAlarmPopup.id);
          return next;
        });
        setDismissedMeetings(prev => {
          const next = new Map(prev);
          next.set(activeAlarmPopup.id, currentTime);
          return next;
        });
      } else {
        setActiveMeds(prev => {
          const next = new Set(prev);
          next.delete(activeAlarmPopup.id);
          return next;
        });
        setDismissedMeds(prev => {
          const next = new Map(prev);
          next.set(activeAlarmPopup.id, currentTime);
          return next;
        });
      }
      setActiveAlarmPopup(null);
    }
    if (snoozeTimeout) {
      clearTimeout(snoozeTimeout);
      setSnoozeTimeout(null);
    }
    
    // Reset guard after state updates
    setTimeout(() => { isProcessingRef.current = false; }, 300);
  }, [activeAlarmPopup, snoozeTimeout, updateAlarm]);

  const snoozeAlarm = useCallback(async (minutes: number = 5) => {
    // Guard against double invocation (touch + click race condition)
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    isSpeakingRef.current = false;

    // Stop native TTS
    try {
      await TextToSpeech.stop();
    } catch (e) {
      // Ignore errors
    }

    // Stop web TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0);

    if (activeAlarmPopup) {
      if (activeAlarmPopup.audio) {
        activeAlarmPopup.audio.pause();
        activeAlarmPopup.audio.src = "";
      }

      const alarmData = activeAlarmPopup;
      setActiveAlarmPopup(null);

      const timeout = setTimeout(() => {
        const item = alarmData.type === 'alarm'
          ? alarms?.find(a => a.id === alarmData.id)
          : medicines?.find(m => m.id === alarmData.id);
        if (item) {
          // Preserve isDateAlarm flag so dismiss still deactivates after snooze
          triggerAlarm(item, alarmData.type, alarmData.isDateAlarm);
        } else {
          triggerFromPushData({
            id: alarmData.id,
            title: alarmData.title,
            textToSpeak: alarmData.message,
            alarmType: alarmData.alarmType,
            voiceUrl: alarmData.voiceUrl,
            imageUrl: alarmData.imageUrl,
            language: alarmData.language,
            type: alarmData.type,
          });
        }
      }, minutes * 60 * 1000);

      setSnoozeTimeout(timeout);
    }
    
    // Reset guard after state updates
    setTimeout(() => { isProcessingRef.current = false; }, 300);
  }, [activeAlarmPopup, alarms, medicines, triggerAlarm, triggerFromPushData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");
      const currentDay = format(now, "EEE");
      const currentDate = format(now, "yyyy-MM-dd");

      alarms?.forEach(alarm => {
        if (!alarm.isActive) return;

        const isTimeMatch = alarm.time === currentTime;
        const isDayMatch = alarm.days?.includes(currentDay);
        const isDateMatch = alarm.date === currentDate;
        const wasDismissedThisMinute = dismissedAlarms.get(alarm.id) === currentTime;

        if (isTimeMatch && (isDayMatch || isDateMatch || (!alarm.days?.length && !alarm.date))) {
          if (!activeAlarms.has(alarm.id) && !wasDismissedThisMinute) {
            triggerAlarm(alarm, 'alarm', isDateMatch);
            setActiveAlarms(prev => new Set(prev).add(alarm.id));
            // NOTE: Date-based alarms are deactivated in dismissAlarm(), not here.
            // This allows "Remind me later" (snooze) to work without deactivating the alarm.
          }
        } else {
          if (activeAlarms.has(alarm.id) && !activeAlarmPopup) {
            setActiveAlarms(prev => {
              const next = new Set(prev);
              next.delete(alarm.id);
              return next;
            });
          }
          if (dismissedAlarms.has(alarm.id) && dismissedAlarms.get(alarm.id) !== currentTime) {
            setDismissedAlarms(prev => {
              const next = new Map(prev);
              next.delete(alarm.id);
              return next;
            });
          }
        }
      });

      medicines?.forEach(med => {
        const isTimeMatch = med.times?.includes(currentTime);
        const wasDismissedThisMinute = dismissedMeds.get(med.id) === currentTime;

        if (isTimeMatch) {
          if (!activeMeds.has(med.id) && !wasDismissedThisMinute) {
            triggerAlarm(med, 'medicine');
            setActiveMeds(prev => new Set(prev).add(med.id));
          }
        } else {
          if (activeMeds.has(med.id) && !activeAlarmPopup) {
            setActiveMeds(prev => {
              const next = new Set(prev);
              next.delete(med.id);
              return next;
            });
          }
          if (dismissedMeds.has(med.id) && dismissedMeds.get(med.id) !== currentTime) {
            setDismissedMeds(prev => {
              const next = new Map(prev);
              next.delete(med.id);
              return next;
            });
          }
        }
      });

      meetings?.forEach(meeting => {
        if (!meeting.enabled) return;
        const isTimeMatch = meeting.time === currentTime;
        const isDateMatch = meeting.date === currentDate;
        const wasDismissedThisMinute = dismissedMeetings.get(meeting.id) === currentTime;

        if (isTimeMatch && isDateMatch) {
          if (!activeMeetings.has(meeting.id) && !wasDismissedThisMinute) {
            const meetingItem = {
              ...meeting,
              type: 'speaking' as const,
              textToSpeak: meeting.textToSpeak || `Meeting: ${meeting.title}${meeting.location ? ` at ${meeting.location}` : ''}`,
              language: user?.language || 'english',
              duration: 30,
              loop: true,
              voiceGender: 'female',
            };
            triggerAlarm(meetingItem, 'meeting');
            setActiveMeetings(prev => new Set(prev).add(meeting.id));
          }
        } else {
          if (activeMeetings.has(meeting.id) && !activeAlarmPopup) {
            setActiveMeetings(prev => {
              const next = new Set(prev);
              next.delete(meeting.id);
              return next;
            });
          }
          if (dismissedMeetings.has(meeting.id) && dismissedMeetings.get(meeting.id) !== currentTime) {
            setDismissedMeetings(prev => {
              const next = new Map(prev);
              next.delete(meeting.id);
              return next;
            });
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, medicines, meetings, activeAlarms, activeMeds, activeMeetings, activeAlarmPopup, dismissedAlarms, dismissedMeds, dismissedMeetings, triggerAlarm, user]);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ALARM_TRIGGER') {
        triggerFromPushData(event.data.data);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [triggerFromPushData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const alarmId = params.get('alarm_id');
    const alarmType = params.get('alarm_type');

    if (alarmId) {
      const data = {
        id: parseInt(alarmId),
        type: alarmType || 'alarm',
        alarmType: params.get('alarm_sound_type') || 'speaking',
        title: params.get('alarm_title') || 'Alarm',
        textToSpeak: params.get('alarm_text'),
        body: params.get('alarm_body'),
        voiceUrl: params.get('alarm_voice_url'),
        imageUrl: params.get('alarm_image_url'),
        photoUrl: params.get('alarm_photo_url'),
        dosage: params.get('alarm_dosage'),
        language: params.get('alarm_language') || 'english',
        duration: params.get('alarm_duration') ? parseInt(params.get('alarm_duration')!) : 30,
        voiceGender: params.get('alarm_voice_gender') || 'female',
      };

      localStorage.setItem('pendingAlarmTrigger', JSON.stringify({ ...data, storedAt: Date.now() }));

      setTimeout(() => triggerFromPushData(data), 500);

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else {
      const pending = localStorage.getItem('pendingAlarmTrigger');
      if (pending) {
        try {
          const data = JSON.parse(pending);
          localStorage.removeItem('pendingAlarmTrigger');
          const age = Date.now() - (data.storedAt || 0);
          if (age < 5 * 60 * 1000) {
            setTimeout(() => triggerFromPushData(data), 500);
          }
        } catch (e) {
          localStorage.removeItem('pendingAlarmTrigger');
        }
      }
    }
  }, [triggerFromPushData]);

  useEffect(() => {
    const handleCustomAlarm = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { alarm, type } = customEvent.detail;
      if (alarm) {
        triggerAlarm(alarm, type || 'alarm');
      }
    };

    window.addEventListener('trigger-alarm', handleCustomAlarm);
    return () => {
      window.removeEventListener('trigger-alarm', handleCustomAlarm);
    };
  }, [triggerAlarm]);

  const [imageError, setImageError] = useState(false);

  // Reset image error when alarm changes
  useEffect(() => {
    setImageError(false);
  }, [activeAlarmPopup?.id]);

  const currentTime = activeAlarmPopup ? format(new Date(), "hh:mm") : "";
  const currentPeriod = activeAlarmPopup ? format(new Date(), "a").toUpperCase() : "";

  if (!activeAlarmPopup) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      className="flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        onClick={() => dismissAlarm()}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
      />

      {/* Compact Modal Dialog */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '90%',
          maxWidth: '420px',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Dark blue header section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #001a40, #002E6E)',
            padding: '24px 24px 28px',
            position: 'relative',
          }}
        >
          {/* Header row: icon + title + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeAlarmPopup?.type === 'meeting' ? (
                <Users style={{ width: '22px', height: '22px', color: 'white' }} />
              ) : (
                <Clock style={{ width: '22px', height: '22px', color: 'white' }} />
              )}
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', fontStyle: 'italic' }}>
                {activeAlarmPopup?.type === 'alarm' ? t.alarm : activeAlarmPopup?.type === 'meeting' ? t.myMeetings : t.medicineReminder}
              </span>
            </div>
            <button
              onClick={() => dismissAlarm()}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
              data-testid="button-dismiss-alarm-x"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alarm title */}
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '6px', lineHeight: 1.3 }}>
            {activeAlarmPopup?.title}
          </h2>

          {/* Alarm message */}
          {activeAlarmPopup?.message && activeAlarmPopup.message !== activeAlarmPopup.title && (
            <p style={{ fontSize: '16px', color: '#7dd3fc', lineHeight: 1.5, fontStyle: 'italic' }}>
              {activeAlarmPopup.message}
            </p>
          )}

          {/* Image (if available) */}
          {activeAlarmPopup?.imageUrl && !imageError && (
            <div style={{ marginTop: '16px' }}>
              <img
                src={activeAlarmPopup.imageUrl}
                alt="Reminder"
                style={{ width: '100%', borderRadius: '12px', objectFit: 'contain', maxHeight: '160px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* White bottom section with action buttons */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={() => snoozeAlarm(5)}
            style={{
              width: '100%',
              height: '56px',
              fontSize: '18px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              color: '#00BAF2',
              fontWeight: 'bold',
              fontStyle: 'italic',
              border: '2px solid #00BAF2',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
            className="hover:bg-sky-50 active:bg-sky-100 transition-all active:scale-[0.98]"
            data-testid="button-remind-later"
          >
            {t.remindMeLater} (5 min)
          </button>
          <button
            onClick={() => dismissAlarm()}
            style={{
              width: '100%',
              height: '56px',
              fontSize: '18px',
              borderRadius: '9999px',
              backgroundColor: '#002E6E',
              color: 'white',
              fontWeight: 'bold',
              fontStyle: 'italic',
              border: 'none',
              cursor: 'pointer',
              touchAction: 'manipulation',
              boxShadow: '0 4px 12px rgba(0,46,110,0.3)',
            }}
            className="hover:bg-[#003580] active:bg-[#001a40] transition-all active:scale-[0.98]"
            data-testid="button-done"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
