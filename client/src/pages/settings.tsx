import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { label: "English", value: "english" },
  { label: "Hindi", value: "hindi" },
  { label: "Marathi", value: "marathi" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (language: string) => {
      const res = await apiRequest("PATCH", "/api/user/settings", { language });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings Updated",
        description: "Your language preference has been saved.",
      });
    },
  });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#002E6E] mb-2">Settings</h1>
        <p className="text-slate-500 text-lg">Manage your global preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Language Settings */}
        <section className="space-y-6">
          <div className="royal-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#00BAF2]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#002E6E]">Global Language</h3>
                <p className="text-sm text-slate-400 font-serif italic">Choose your preferred language</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>App Language</Label>
                <Select 
                  value={user?.language || "english"} 
                  onValueChange={(val) => mutation.mutate(val)}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger className="royal-input h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mutation.isPending && (
                  <div className="flex items-center gap-2 text-[#00BAF2] text-sm font-serif italic mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving preference...
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section className="space-y-6">
          <div className="bg-gradient-to-br from-[#002E6E] to-[#001a40] rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-8 h-8 text-yellow-400" />
                <h3 className="text-2xl font-bold tracking-wide italic">Premium Plan</h3>
              </div>
              <p className="text-blue-200 mb-8">Unlock unlimited alarms and family voice sharing.</p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#00BAF2]" />
                  </div>
                  <span>Unlimited Speaking Alarms</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#00BAF2]" />
                  </div>
                  <span>Medicine Photo Library</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#00BAF2]" />
                  </div>
                  <span>Family Voice Sharing</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 flex justify-between items-center mb-6 border border-white/5">
                <div>
                  <p className="text-sm text-blue-200">Current Plan</p>
                  <p className="font-bold text-lg">{user?.subscriptionStatus === 'active' ? 'Premium' : '30 Days Free Trial'}</p>
                </div>
                <span className="text-[#00BAF2] bg-[#00BAF2]/10 px-3 py-1 rounded-full text-sm font-bold border border-[#00BAF2]/20">Active</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button className="bg-white text-[#002E6E] hover:bg-blue-50 font-bold">
                  ₹30 / Month
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  ₹365 / Year
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
