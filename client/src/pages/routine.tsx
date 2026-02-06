import Layout from "@/components/layout";
import { AlarmModal } from "@/components/alarm-modal";
import { useAlarms, useDeleteAlarm, useUpdateAlarm } from "@/hooks/use-alarms";
import { useMedicines } from "@/hooks/use-medicines";
import { Switch } from "@/components/ui/switch";
import { Trash2, Mic, Volume2, Music, Vibrate, PlayCircle, Loader2, Edit2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/hooks/use-translations";

export default function Dashboard() {
  const { user } = useAuth();
  const t = useTranslations();
  const { data: alarms, isLoading: alarmsLoading } = useAlarms();
  const { data: medicines, isLoading: medsLoading } = useMedicines();
  const deleteAlarm = useDeleteAlarm();
  const updateAlarm = useUpdateAlarm();

  const formatTimeTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const dayNight = (h >= 6 && h < 18) ? t.day : t.night;
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${dayNight}`;
  };

  const sortedAlarms = alarms?.slice().sort((a, b) => {
    const timeA = a.time.replace(':', '');
    const timeB = b.time.replace(':', '');
    return parseInt(timeA) - parseInt(timeB);
  });

  const handlePlayAlarm = (alarm: any) => {
    window.dispatchEvent(new CustomEvent('trigger-alarm', { detail: { alarm, type: 'alarm' } }));
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#002E6E] mb-2 italic">{t.myRoutine}</h1>
          <p className="text-slate-500 text-lg">{t.newAlarm}</p>
        </div>
        <AlarmModal />
      </div>

      {sortedAlarms?.length === 0 ? (
        <div className="royal-card p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Mic className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-[#002E6E] mb-2">{t.noAlarms}</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">{t.createFirstAlarm}</p>
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
                      onClick={() => handlePlayAlarm(alarm)}
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
