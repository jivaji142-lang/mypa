import Layout from "@/components/layout";
import { AlarmModal } from "@/components/alarm-modal";
import { useAlarms, useDeleteAlarm, useUpdateAlarm } from "@/hooks/use-alarms";
import { useMedicines } from "@/hooks/use-medicines";
import { Switch } from "@/components/ui/switch";
import { Trash2, Mic, Volume2, Music, Vibrate, PlayCircle, Loader2, Edit2, Calendar, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ActiveAlarmData {
  id: number;
  type: 'alarm' | 'medicine';
  title: string;
  message: string;
  imageUrl?: string;
  audio?: HTMLAudioElement;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: alarms, isLoading: alarmsLoading } = useAlarms();
  const { data: medicines, isLoading: medsLoading } = useMedicines();
  const deleteAlarm = useDeleteAlarm();
  const updateAlarm = useUpdateAlarm();
  const [activeAlarms, setActiveAlarms] = useState<Set<number>>(new Set());
  const [activeMeds, setActiveMeds] = useState<Set<number>>(new Set());
  const [activeAlarmPopup, setActiveAlarmPopup] = useState<ActiveAlarmData | null>(null);
  const [snoozeTimeout, setSnoozeTimeout] = useState<NodeJS.Timeout | null>(null);
  const vibrateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  const formatTimeTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const dayNight = (h >= 6 && h < 18) ? 'Day' : 'Night';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${dayNight}`;
  };

  const sortedAlarms = alarms?.slice().sort((a, b) => {
    const timeA = a.time.replace(':', '');
    const timeB = b.time.replace(':', '');
    return parseInt(timeA) - parseInt(timeB);
  });

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

        if (isTimeMatch && (isDayMatch || isDateMatch || (!alarm.days?.length && !alarm.date))) {
          if (!activeAlarms.has(alarm.id)) {
            triggerAlarm(alarm, 'alarm');
            setActiveAlarms(prev => new Set(prev).add(alarm.id));
            if (isDateMatch) updateAlarm.mutate({ id: alarm.id, isActive: false });
          }
        } else if (activeAlarms.has(alarm.id) && !activeAlarmPopup) {
          setActiveAlarms(prev => {
            const next = new Set(prev);
            next.delete(alarm.id);
            return next;
          });
        }
      });

      medicines?.forEach(med => {
        const isTimeMatch = med.times?.includes(currentTime);
        if (isTimeMatch) {
          if (!activeMeds.has(med.id)) {
            triggerAlarm(med, 'medicine');
            setActiveMeds(prev => new Set(prev).add(med.id));
          }
        } else if (activeMeds.has(med.id) && !activeAlarmPopup) {
          setActiveMeds(prev => {
            const next = new Set(prev);
            next.delete(med.id);
            return next;
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, medicines, activeAlarms, activeMeds, activeAlarmPopup]);

  const triggerAlarm = (item: any, type: 'alarm' | 'medicine') => {
    console.log(`Triggering ${type}:`, item.id);
    const duration = (item.duration || 30) * 1000;
    const shouldLoop = item.loop !== false;
    let audio: HTMLAudioElement | undefined;

    const message = item.textToSpeak || item.title || (type === 'medicine' ? `Time for medicine: ${item.name}` : 'Alarm');

    setActiveAlarmPopup({
      id: item.id,
      type,
      title: item.title || item.name || 'Alarm',
      message,
      imageUrl: item.imageUrl || item.photoUrl,
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
      audio.play().catch(err => {
        console.error("Audio playback failed:", err);
        if (item.textToSpeak) speakTTS(item, type, shouldLoop);
      });
      
      setActiveAlarmPopup(prev => prev ? { ...prev, audio } : null);

      setTimeout(() => {
        audio?.pause();
        if (audio) audio.src = "";
      }, duration);

    } else if (item.textToSpeak || type === 'medicine' || item.type === 'speaking') {
      const msg = item.textToSpeak || (type === 'medicine' ? `Time for your medicine: ${item.name}` : item.title || "Alarm");
      if (msg) {
        speakTTS({ ...item, textToSpeak: msg }, type, shouldLoop);
        setTimeout(() => {
          window.speechSynthesis.cancel();
        }, duration);
      }
    }
  };

  const speakTTS = (item: any, type: 'alarm' | 'medicine', shouldLoop: boolean = true) => {
    isSpeakingRef.current = true;
    
    const speak = () => {
      if (!isSpeakingRef.current) return;
      
      const utterance = new SpeechSynthesisUtterance(item.textToSpeak || "");
      const lang = user?.language || item.language || 'english';
      
      const langMap: Record<string, string> = {
        english: 'en-US', hindi: 'hi-IN', marathi: 'mr-IN', spanish: 'es-ES',
        french: 'fr-FR', german: 'de-DE', chinese: 'zh-CN', japanese: 'ja-JP',
        arabic: 'ar-SA', russian: 'ru-RU', portuguese: 'pt-PT', bengali: 'bn-IN',
        telugu: 'te-IN', tamil: 'ta-IN', gujarati: 'gu-IN', kannada: 'kn-IN',
        malayalam: 'ml-IN', punjabi: 'pa-IN'
      };
      
      utterance.lang = langMap[lang] || 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v: any) => v.lang.startsWith(utterance.lang.slice(0, 2)) && v.name.includes(item.voiceGender === 'male' ? 'Male' : 'Female')) || 
                      voices.find((v: any) => v.lang.startsWith(utterance.lang.slice(0, 2)));
      
      if (preferred) utterance.voice = preferred;
      
      utterance.onend = () => {
        if (shouldLoop && isSpeakingRef.current) {
          setTimeout(speak, 500);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    window.speechSynthesis.cancel(); 
    speak();
  };

  const dismissAlarm = () => {
    isSpeakingRef.current = false;
    window.speechSynthesis.cancel();
    
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
      
      if (activeAlarmPopup.type === 'alarm') {
        setActiveAlarms(prev => {
          const next = new Set(prev);
          next.delete(activeAlarmPopup.id);
          return next;
        });
      } else {
        setActiveMeds(prev => {
          const next = new Set(prev);
          next.delete(activeAlarmPopup.id);
          return next;
        });
      }
      setActiveAlarmPopup(null);
    }
    if (snoozeTimeout) {
      clearTimeout(snoozeTimeout);
      setSnoozeTimeout(null);
    }
  };

  const snoozeAlarm = (minutes: number = 5) => {
    isSpeakingRef.current = false;
    window.speechSynthesis.cancel();
    
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
          triggerAlarm(item, alarmData.type);
        }
      }, minutes * 60 * 1000);
      
      setSnoozeTimeout(timeout);
    }
  };

  const getAlarmTypeIcon = (type: string) => {
    switch (type) {
      case 'custom_voice': return <Mic className="w-3 h-3 text-[#00BAF2]" />;
      case 'music': return <Music className="w-3 h-3 text-[#00BAF2]" />;
      case 'vibration': return <Vibrate className="w-3 h-3 text-[#00BAF2]" />;
      default: return <Volume2 className="w-3 h-3 text-[#00BAF2]" />;
    }
  };

  if (alarmsLoading || medsLoading) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#00BAF2] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Dialog open={!!activeAlarmPopup} onOpenChange={(open) => !open && dismissAlarm()}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-[#002E6E] to-[#001a40] p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-bold">{activeAlarmPopup?.type === 'alarm' ? 'Alarm' : 'Medicine Reminder'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={dismissAlarm}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <h2 className="text-2xl font-bold mb-2">{activeAlarmPopup?.title}</h2>
            <p className="text-blue-200 text-lg">{activeAlarmPopup?.message}</p>
          </div>
          
          {activeAlarmPopup?.imageUrl && (
            <div className="p-4">
              <img 
                src={activeAlarmPopup.imageUrl} 
                alt="Reminder" 
                className="w-full rounded-xl object-contain max-h-64 bg-slate-50"
              />
            </div>
          )}
          
          <div className="p-6 pt-2 space-y-3">
            <Button 
              onClick={() => snoozeAlarm(5)}
              variant="outline"
              className="w-full h-12 text-lg rounded-xl border-2 border-[#00BAF2] text-[#00BAF2] hover:bg-[#00BAF2]/10 font-semibold"
              data-testid="button-remind-later"
            >
              Remind Me Later (5 min)
            </Button>
            <Button 
              onClick={dismissAlarm}
              className="w-full h-12 text-lg rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-semibold"
              data-testid="button-done"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#002E6E] mb-2 italic">My Routine</h1>
          <p className="text-slate-500 text-lg">Manage your daily reminders and voices.</p>
        </div>
        <AlarmModal />
      </div>

      {sortedAlarms?.length === 0 ? (
        <div className="royal-card p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Mic className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-[#002E6E] mb-2">No Routine Set</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first speaking alarm. You can even record your mom's voice!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAlarms?.map((alarm) => (
            <div key={alarm.id} className="royal-card p-6 flex flex-col justify-between group relative overflow-hidden" data-testid={`alarm-card-${alarm.id}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getAlarmTypeIcon(alarm.type || 'speaking')}
                    <span className="text-[10px] font-bold text-[#00BAF2] uppercase tracking-wider truncate max-w-[120px]">{alarm.title}</span>
                  </div>
                  <h2 className="text-4xl font-bold text-[#002E6E] num tracking-tight leading-none mb-1">
                    {formatTimeTo12Hour(alarm.time)}
                  </h2>
                  {alarm.date && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" /> {format(new Date(alarm.date), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Switch 
                    checked={alarm.isActive || false}
                    onCheckedChange={(checked) => updateAlarm.mutate({ id: alarm.id, isActive: checked })}
                    className="data-[state=checked]:bg-[#00BAF2]"
                    data-testid={`switch-alarm-${alarm.id}`}
                  />
                  {alarm.imageUrl && (
                    <div className="w-14 h-14 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-slate-100">
                      <img src={alarm.imageUrl} className="w-full h-full object-cover" alt="Reminder" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4 z-10">
                <div className="flex flex-wrap gap-1">
                  {(alarm.days && alarm.days.length > 0) ? alarm.days.map((day: string, i: number) => (
                    <span key={i} className="text-[9px] uppercase font-bold text-blue-400 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50">
                      {day.slice(0, 3)}
                    </span>
                  )) : !alarm.date && <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Once</span>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => triggerAlarm(alarm, 'alarm')}
                      className="text-[#002E6E] hover:text-[#00BAF2] hover:bg-blue-50 w-8 h-8 rounded-full"
                      data-testid={`button-play-${alarm.id}`}
                    >
                      <PlayCircle className="w-5 h-5" />
                    </Button>
                    <AlarmModal 
                      alarm={alarm} 
                      trigger={
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 w-8 h-8 rounded-full"
                          data-testid={`button-edit-${alarm.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      } 
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this alarm?")) {
                        deleteAlarm.mutate(alarm.id);
                      }
                    }}
                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full w-8 h-8"
                    data-testid={`button-delete-${alarm.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
