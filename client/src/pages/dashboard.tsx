import Layout from "@/components/layout";
import { AlarmModal } from "@/components/alarm-modal";
import { useAlarms, useDeleteAlarm, useUpdateAlarm } from "@/hooks/use-alarms";
import { Switch } from "@/components/ui/switch";
import { Trash2, Mic, MessageSquare, PlayCircle, Loader2, Edit2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { data: alarms, isLoading, error } = useAlarms();
  const deleteAlarm = useDeleteAlarm();
  const updateAlarm = useUpdateAlarm();
  const [activeAlarms, setActiveAlarms] = useState<Set<number>>(new Set());

  // Real-time alarm checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");
      const currentDay = format(now, "EEE"); // Mon, Tue...
      const currentDate = format(now, "yyyy-MM-dd");

      alarms?.forEach(alarm => {
        if (!alarm.isActive) return;

        const isTimeMatch = alarm.time === currentTime;
        const isDayMatch = alarm.days?.includes(currentDay);
        const isDateMatch = alarm.date === currentDate;

        if (isTimeMatch && (isDayMatch || isDateMatch || (!alarm.days?.length && !alarm.date))) {
          if (!activeAlarms.has(alarm.id)) {
            triggerAlarm(alarm);
            setActiveAlarms(prev => new Set(prev).add(alarm.id));
            
            // Auto-disable if it's a specific date alarm
            if (isDateMatch) {
              updateAlarm.mutate({ id: alarm.id, isActive: false });
            }
          }
        } else if (activeAlarms.has(alarm.id)) {
          // Reset when time passes
          setActiveAlarms(prev => {
            const next = new Set(prev);
            next.delete(alarm.id);
            return next;
          });
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, activeAlarms]);

  const triggerAlarm = (alarm: any) => {
    console.log("Triggering alarm:", alarm.id);
    const duration = (alarm.duration || 30) * 1000;
    const shouldLoop = alarm.loop !== false;
    let stopTimeout: any;

    const stopAlarm = () => {
      window.speechSynthesis.cancel();
      setActiveAlarms(prev => {
        const next = new Set(prev);
        next.delete(alarm.id);
        return next;
      });
      if (stopTimeout) clearTimeout(stopTimeout);
    };

    // Play sound/TTS
    if (alarm.voiceUrl) {
      const audio = new Audio(alarm.voiceUrl);
      audio.loop = shouldLoop;
      audio.play().catch(err => {
        console.error("Audio playback failed:", err);
        if (alarm.textToSpeak) speakTTS(alarm, shouldLoop);
      });
      
      stopTimeout = setTimeout(() => {
        audio.pause();
        audio.src = "";
        stopAlarm();
      }, duration);

    } else if (alarm.textToSpeak) {
      speakTTS(alarm, shouldLoop);
      stopTimeout = setTimeout(stopAlarm, duration);
    }
  };

  const speakTTS = (alarm: any, shouldLoop: boolean = true) => {
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(alarm.textToSpeak || "");
      utterance.lang = alarm.language === 'hindi' ? 'hi-IN' : alarm.language === 'marathi' ? 'mr-IN' : 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v: any) => v.lang.startsWith(utterance.lang.slice(0, 2)) && v.name.includes(alarm.voiceGender === 'female' ? 'Female' : 'Male')) || 
                      voices.find((v: any) => v.lang.startsWith(utterance.lang.slice(0, 2)));
      
      if (preferred) utterance.voice = preferred;
      
      utterance.onend = () => {
        if (shouldLoop && activeAlarms.has(alarm.id)) {
          speak();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    window.speechSynthesis.cancel(); 
    speak();
  };

  if (isLoading) {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#002E6E] mb-2">My Alarms</h1>
          <p className="text-slate-500 text-lg">Manage your daily reminders and voices.</p>
        </div>
        <AlarmModal />
      </div>

      {alarms?.length === 0 ? (
        <div className="royal-card p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Mic className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-[#002E6E] mb-2">No Alarms Set</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first speaking alarm. You can even record your mom's voice!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alarms?.map((alarm) => (
            <div key={alarm.id} className="royal-card p-6 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {alarm.type === "custom_voice" && <Mic className="w-3 h-3 text-[#00BAF2]" />}
                    {alarm.type === "text" && <MessageSquare className="w-3 h-3 text-[#00BAF2]" />}
                    <span className="text-[10px] font-bold text-[#00BAF2] uppercase tracking-wider truncate max-w-[120px]">{alarm.title}</span>
                  </div>
                  <h2 className="text-5xl font-bold text-[#002E6E] num tracking-tight leading-none mb-2">{alarm.time}</h2>
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
                  />
                  {alarm.imageUrl && (
                    <div className="w-12 h-12 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-slate-100">
                      <img src={alarm.imageUrl} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4 z-10">
                <div className="flex flex-wrap gap-1">
                  {alarm.days?.length > 0 ? alarm.days.map((day: string, i: number) => (
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
                      onClick={() => triggerAlarm(alarm)}
                      className="text-[#002E6E] hover:text-[#00BAF2] hover:bg-blue-50 w-8 h-8 rounded-full"
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
