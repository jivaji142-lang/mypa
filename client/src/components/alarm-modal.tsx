import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Camera, Image as ImageIcon, Volume2, Mic, Music, Vibrate } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateAlarm, useUpdateAlarm } from "@/hooks/use-alarms";
import { useUpload } from "@/hooks/use-upload";
import { VoiceRecorder } from "@/components/voice-recorder";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AlarmModalProps {
  alarm?: any;
  trigger?: React.ReactNode;
}

export function AlarmModal({ alarm, trigger }: AlarmModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const createAlarm = useCreateAlarm();
  const updateAlarm = useUpdateAlarm();
  const upload = useUpload();
  
  const [formData, setFormData] = useState({
    title: "",
    time: "07:00",
    date: "",
    days: [] as string[],
    type: "speaking",
    textToSpeak: "",
    voiceGender: "female",
    voiceUrl: "",
    imageUrl: "",
    language: "english",
    duration: 30,
    loop: true,
  });

  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (alarm) {
      setFormData({
        title: alarm.title || "",
        time: alarm.time || "07:00",
        date: alarm.date || "",
        days: alarm.days || [],
        type: alarm.type || "speaking",
        textToSpeak: alarm.textToSpeak || "",
        voiceGender: alarm.voiceGender || "female",
        voiceUrl: alarm.voiceUrl || "",
        imageUrl: alarm.imageUrl || "",
        language: alarm.language || user?.language || "english",
        duration: alarm.duration || 30,
        loop: alarm.loop !== undefined ? alarm.loop : true,
      });
      setImagePreview(alarm.imageUrl || "");
    } else {
      setFormData(prev => ({
        ...prev,
        title: "",
        time: "07:00",
        date: "",
        days: [],
        type: "speaking",
        textToSpeak: "",
        voiceGender: "female",
        voiceUrl: "",
        imageUrl: "",
        language: user?.language || "english",
        duration: 30,
        loop: true,
      }));
      setImagePreview("");
    }
  }, [alarm, open, user?.language]);

  const formatTimeTo12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const dayNight = (h >= 6 && h < 18) ? 'Day' : 'Night';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${dayNight}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      userId: "placeholder",
    };

    if (alarm) {
      updateAlarm.mutate({ id: alarm.id, ...data }, {
        onSuccess: () => setOpen(false),
      });
    } else {
      createAlarm.mutate(data, {
        onSuccess: () => setOpen(false),
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            className="rounded-xl px-6 py-6 bg-gradient-to-r from-[#00BAF2] to-[#002E6E] shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all text-white font-semibold text-lg italic"
            data-testid="button-new-alarm"
          >
            <Plus className="w-5 h-5 mr-2" /> New Alarm
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-white border-blue-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#002E6E] font-bold">
            {alarm ? "Edit Alarm" : "Set New Alarm"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alarm Name</Label>
              <Input 
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Wake Up"
                required
                className="royal-input"
                data-testid="input-alarm-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Time <span className="text-xs text-slate-400">(Day/Night)</span></Label>
              <div className="relative">
                <Input 
                  type="time" 
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  required
                  className="royal-input num text-center text-lg font-bold"
                  data-testid="input-alarm-time"
                />
                <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-[#00BAF2] font-medium">
                  {formatTimeTo12Hour(formData.time)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Schedule Type</Label>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Specific Date (Optional)</Label>
              <Input 
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="royal-input"
                data-testid="input-alarm-date"
              />
            </div>
            
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-slate-500">Repeat Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.days.includes(day) ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-10 text-[10px] p-0 rounded-md ${formData.days.includes(day) ? "bg-[#00BAF2] hover:bg-[#00BAF2]/90" : "text-slate-500"}`}
                    onClick={() => toggleDay(day)}
                    data-testid={`button-day-${day}`}
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Alarm Type</Label>
            <RadioGroup 
              value={formData.type} 
              onValueChange={val => setFormData({ ...formData, type: val })}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                <RadioGroupItem value="speaking" id="speaking" />
                <Volume2 className="w-4 h-4 text-[#00BAF2]" />
                <Label htmlFor="speaking" className="cursor-pointer text-xs">Speaking</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                <RadioGroupItem value="custom_voice" id="custom" />
                <Mic className="w-4 h-4 text-[#00BAF2]" />
                <Label htmlFor="custom" className="cursor-pointer text-xs">My Voice</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                <RadioGroupItem value="music" id="music" />
                <Music className="w-4 h-4 text-[#00BAF2]" />
                <Label htmlFor="music" className="cursor-pointer text-xs">Music</Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                <RadioGroupItem value="vibration" id="vibration" />
                <Vibrate className="w-4 h-4 text-[#00BAF2]" />
                <Label htmlFor="vibration" className="cursor-pointer text-xs">Vibration</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Photo (Visual Reminder)</Label>
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 royal-input h-10 gap-2 border-dashed"
                onClick={() => document.getElementById('camera-input')?.click()}
              >
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 royal-input h-10 gap-2 border-dashed"
                onClick={() => document.getElementById('gallery-input')?.click()}
              >
                <ImageIcon className="w-4 h-4" /> Gallery
              </Button>
              <input 
                id="camera-input" 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <input 
                id="gallery-input" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
            </div>
            {imagePreview && (
              <div className="relative rounded-lg overflow-hidden border border-blue-100 bg-slate-50">
                <img src={imagePreview} className="w-full max-h-48 object-contain" alt="Alarm reminder" />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImagePreview("");
                    setFormData(prev => ({ ...prev, imageUrl: "" }));
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {formData.type === "custom_voice" && (
            <VoiceRecorder 
              onRecordingComplete={(blob) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                  setFormData(prev => ({ ...prev, voiceUrl: reader.result as string }));
                };
                upload.mutate(blob);
              }} 
              isUploading={upload.isPending} 
            />
          )}

          {formData.type === "speaking" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Message to Speak</Label>
                <Input 
                  value={formData.textToSpeak || ""}
                  onChange={e => setFormData({ ...formData, textToSpeak: e.target.value })}
                  placeholder="Good morning, time to wake up..."
                  className="royal-input"
                  data-testid="input-text-to-speak"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Voice Preference</Label>
                <Select 
                  value={formData.voiceGender || "female"} 
                  onValueChange={val => setFormData({ ...formData, voiceGender: val })}
                >
                  <SelectTrigger className="royal-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female (Soft & Gentle)</SelectItem>
                    <SelectItem value="male">Male (Calm & Clear)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.type === "music" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Upload Music File</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full royal-input h-10 gap-2 border-dashed"
                  onClick={() => document.getElementById('music-input')?.click()}
                >
                  <Music className="w-4 h-4" /> Choose Audio File
                </Button>
                <input 
                  id="music-input" 
                  type="file" 
                  accept="audio/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, voiceUrl: reader.result as string }));
                      };
                    }
                  }}
                />
                {formData.voiceUrl && formData.type === "music" && (
                  <p className="text-xs text-green-600">Audio file selected</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stop After (Seconds)</Label>
              <Input 
                type="number"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="royal-input num"
                min="5"
                max="300"
                data-testid="input-duration"
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox 
                id="loop" 
                checked={formData.loop} 
                onCheckedChange={(checked) => setFormData({ ...formData, loop: !!checked })}
              />
              <Label htmlFor="loop" className="cursor-pointer">Loop Sound</Label>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={
              createAlarm.isPending || 
              updateAlarm.isPending || 
              upload.isPending ||
              (formData.type === "custom_voice" && !formData.voiceUrl) ||
              (formData.type === "music" && !formData.voiceUrl)
            }
            className="w-full h-12 text-lg rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-semibold shadow-lg shadow-blue-900/10 italic"
            data-testid="button-submit-alarm"
          >
            {(createAlarm.isPending || updateAlarm.isPending) ? <Loader2 className="animate-spin" /> : alarm ? "Update Alarm" : "Set Alarm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
