import Layout from "@/components/layout";
import { MedicineModal } from "@/components/medicine-modal";
import { useMedicines, useDeleteMedicine } from "@/hooks/use-medicines";
import { Trash2, Pill, Loader2, Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Medicines() {
  const { data: medicines, isLoading } = useMedicines();
  const deleteMedicine = useDeleteMedicine();

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
          <h1 className="text-4xl font-bold text-[#002E6E] mb-2">My Medicines</h1>
          <p className="text-slate-500 text-lg">Keep track of your health and doses.</p>
        </div>
        <MedicineModal />
      </div>

      {medicines?.length === 0 ? (
        <div className="royal-card p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Pill className="w-10 h-10 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-[#002E6E] mb-2">No Medicines Added</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Add your medications and we'll remind you to take them on time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medicines?.map((medicine) => (
            <div key={medicine.id} className="royal-card group overflow-hidden flex flex-col">
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                {medicine.photoUrl ? (
                  <img src={medicine.photoUrl} alt={medicine.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Pill className="w-16 h-16 text-blue-100" />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <MedicineModal 
                    medicine={medicine}
                    trigger={
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this medicine?")) {
                        deleteMedicine.mutate(medicine.id);
                      }
                    }}
                    className="rounded-full shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#002E6E] mb-1">{medicine.name}</h2>
                    <p className="text-slate-500 font-medium">{medicine.dosage}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scheduled Times</Label>
                  <div className="flex flex-wrap gap-2">
                    {(medicine.times || (medicine.timeOfDay ? [medicine.timeOfDay] : [])).map((time: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#00BAF2] rounded-lg border border-blue-100 font-bold text-sm">
                        <Clock className="w-3.5 h-3.5" /> {time}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
