import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Plus, Loader2, Camera, Image as ImageIcon, X, Volume2, Mic, Music, Vibrate } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateMedicine, useUpdateMedicine } from "@/hooks/use-medicines";
import { VoiceRecorder } from "@/components/voice-recorder";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";

const LANGUAGES = [
  { label: "English", value: "english" },
  { label: "Hindi (हिंदी)", value: "hindi" },
  { label: "Marathi (मराठी)", value: "marathi" },
  { label: "Spanish (Español)", value: "spanish" },
  { label: "French (Français)", value: "french" },
  { label: "German (Deutsch)", value: "german" },
  { label: "Chinese (中文)", value: "chinese" },
  { label: "Japanese (日本語)", value: "japanese" },
  { label: "Arabic (العربية)", value: "arabic" },
  { label: "Russian (Русский)", value: "russian" },
  { label: "Portuguese (Português)", value: "portuguese" },
  { label: "Bengali (বাংলা)", value: "bengali" },
  { label: "Telugu (తెలుగు)", value: "telugu" },
  { label: "Tamil (தமிழ்)", value: "tamil" },
  { label: "Gujarati (ગુજરાતી)", value: "gujarati" },
  { label: "Kannada (ಕನ್ನಡ)", value: "kannada" },
  { label: "Malayalam (മലയാളം)", value: "malayalam" },
  { label: "Punjabi (ਪੰਜਾਬੀ)", value: "punjabi" },
];

interface MedicineModalProps {
  medicine?: any;
  trigger?: React.ReactNode;
}

export function MedicineModal({ medicine, trigger }: MedicineModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    times: ["08:00"],
    photoUrl: "",
    type: "speaking",
    textToSpeak: "",
    voiceGender: "female",
    voiceUrl: "",
    language: "english",
    duration: 30,
    loop: true,
  });

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || "",
        dosage: medicine.dosage || "",
        times: medicine.times || (medicine.timeOfDay ? [medicine.timeOfDay] : ["08:00"]),
        photoUrl: medicine.photoUrl || "",
        type: medicine.type || "speaking",
        textToSpeak: medicine.textToSpeak || "",
        voiceGender: medicine.voiceGender || "female",
        voiceUrl: medicine.voiceUrl || "",
        language: medicine.language || user?.language || "english",
        duration: medicine.duration || 30,
        loop: medicine.loop !== undefined ? medicine.loop : true,
      });
    } else {
      setFormData(prev => ({
        ...prev,
        name: "",
        dosage: "",
        times: ["08:00"],
        photoUrl: "",
        type: "speaking",
        textToSpeak: "",
        voiceGender: "female",
        voiceUrl: "",
        language: user?.language || "english",
        duration: 30,
        loop: true,
      }));
    }
  }, [medicine, open, user?.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // DO NOT send userId from client - backend extracts it from JWT token
    const data = {
      ...formData,
    };

    if (medicine) {
      updateMedicine.mutate({ id: medicine.id, ...data }, {
        onSuccess: () => setOpen(false),
      });
    } else {
      createMedicine.mutate(data, {
        onSuccess: () => setOpen(false),
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'voiceUrl' | 'photoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
    }
  };

  const addTime = () => {
    setFormData(prev => ({ ...prev, times: [...prev.times, "08:00"] }));
  };

  const removeTime = (index: number) => {
    setFormData(prev => ({ ...prev, times: prev.times.filter((_, i) => i !== index) }));
  };

  const updateTime = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? value : t)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="rounded-xl px-6 py-6 bg-[#00BAF2] hover:bg-[#00BAF2]/90 shadow-lg shadow-blue-500/20 text-white font-semibold text-lg italic transition-all active:scale-95">
            <Plus className="w-5 h-5 mr-2" /> New Medicine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-white border-blue-50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#002E6E] font-bold">
            {medicine ? "Edit Medicine" : "Add New Medicine"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medicine Name</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vitamin D3"
                required
                className="royal-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input 
                value={formData.dosage}
                onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 1 Tablet"
                required
                className="royal-input"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex justify-between items-center">
                <span>Dose Times</span>
                <Button type="button" variant="outline" size="sm" onClick={addTime} className="h-7 text-xs border-[#00BAF2] text-[#00BAF2] hover:bg-blue-50">
                  + Add Time
                </Button>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {formData.times.map((time, index) => (
                  <div key={index} className="flex gap-2">
                    <Input 
                      type="time" 
                      value={time}
                      onChange={e => updateTime(index, e.target.value)}
                      className="royal-input num text-center font-bold"
                    />
                    {formData.times.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeTime(index)}
                        className="text-red-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
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
                  <RadioGroupItem value="speaking" id="med-speaking" />
                  <Volume2 className="w-4 h-4 text-[#00BAF2]" />
                  <Label htmlFor="med-speaking" className="cursor-pointer text-xs">Speaking</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                  <RadioGroupItem value="custom_voice" id="med-custom" />
                  <Mic className="w-4 h-4 text-[#00BAF2]" />
                  <Label htmlFor="med-custom" className="cursor-pointer text-xs">My Voice</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                  <RadioGroupItem value="music" id="med-music" />
                  <Music className="w-4 h-4 text-[#00BAF2]" />
                  <Label htmlFor="med-music" className="cursor-pointer text-xs">Music</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-[#00BAF2]">
                  <RadioGroupItem value="vibration" id="med-vibration" />
                  <Vibrate className="w-4 h-4 text-[#00BAF2]" />
                  <Label htmlFor="med-vibration" className="cursor-pointer text-xs">Vibration</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.type === "custom_voice" && (
              <VoiceRecorder 
                onRecordingComplete={(blob) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  reader.onloadend = () => {
                    setFormData(prev => ({ ...prev, voiceUrl: reader.result as string }));
                  };
                }} 
                isUploading={false} 
              />
            )}

            {formData.type === "speaking" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Message to Speak</Label>
                  <Input 
                    value={formData.textToSpeak || ""}
                    onChange={e => setFormData({ ...formData, textToSpeak: e.target.value })}
                    placeholder="Time for medicine..."
                    className="royal-input"
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
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
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
                    onClick={() => document.getElementById('med-music-input')?.click()}
                  >
                    <Music className="w-4 h-4" /> Choose Audio File
                  </Button>
                  <input 
                    id="med-music-input" 
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
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <Music className="w-4 h-4 text-[#00BAF2]" />
                      <span className="text-sm text-slate-600">Audio file selected</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, voiceUrl: "" }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.type === "vibration" && (
              <div className="p-4 bg-blue-50 rounded-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <Vibrate className="w-6 h-6 text-[#00BAF2]" />
                  <p className="text-sm text-slate-600">
                    Your device will vibrate when this medicine reminder triggers.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Medicine Photo</Label>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 royal-input h-10 gap-2 border-dashed"
                  onClick={() => document.getElementById('med-camera')?.click()}
                >
                  <Camera className="w-4 h-4" /> Camera
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 royal-input h-10 gap-2 border-dashed"
                  onClick={() => document.getElementById('med-gallery')?.click()}
                >
                  <ImageIcon className="w-4 h-4" /> Gallery
                </Button>
                <input 
                  id="med-camera" 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'photoUrl')}
                />
                <input 
                  id="med-gallery" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'photoUrl')}
                />
              </div>
              {formData.photoUrl && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm mt-2">
                  <img src={formData.photoUrl} className="w-full h-full object-cover" />
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-0 right-0 w-6 h-6 rounded-none"
                    onClick={() => setFormData(prev => ({ ...prev, photoUrl: "" }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

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
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox 
                  id="med-loop" 
                  checked={formData.loop} 
                  onCheckedChange={(checked) => setFormData({ ...formData, loop: !!checked })}
                />
                <Label htmlFor="med-loop" className="cursor-pointer">Loop Sound</Label>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={createMedicine.isPending || updateMedicine.isPending}
            className="w-full h-12 text-lg rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-semibold shadow-lg shadow-blue-900/10 italic"
          >
            {(createMedicine.isPending || updateMedicine.isPending) ? <Loader2 className="animate-spin" /> : medicine ? "Update Medicine" : "Add Medicine"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
