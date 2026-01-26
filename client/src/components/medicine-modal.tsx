import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Plus, Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCreateMedicine, useUpdateMedicine } from "@/hooks/use-medicines";
import { useUpload } from "@/hooks/use-upload";

interface MedicineModalProps {
  medicine?: any;
  trigger?: React.ReactNode;
}

export function MedicineModal({ medicine, trigger }: MedicineModalProps) {
  const [open, setOpen] = useState(false);
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  const upload = useUpload();
  
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    times: ["08:00"],
    photoUrl: "",
  });

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || "",
        dosage: medicine.dosage || "",
        times: medicine.times || (medicine.timeOfDay ? [medicine.timeOfDay] : ["08:00"]),
        photoUrl: medicine.photoUrl || "",
      });
    }
  }, [medicine, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      userId: "placeholder",
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      upload.mutate(file, {
        onSuccess: (data) => {
          setFormData(prev => ({ ...prev, photoUrl: data.url }));
        }
      });
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
                  onChange={handleFileUpload}
                />
                <input 
                  id="med-gallery" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
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
          </div>

          <Button 
            type="submit" 
            disabled={createMedicine.isPending || updateMedicine.isPending || upload.isPending}
            className="w-full h-12 text-lg rounded-xl bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-semibold shadow-lg shadow-blue-900/10 italic"
          >
            {(createMedicine.isPending || updateMedicine.isPending) ? <Loader2 className="animate-spin" /> : medicine ? "Update Medicine" : "Add Medicine"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
