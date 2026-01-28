import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/hooks/use-translations";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations();

  const mutation = useMutation({
    mutationFn: async (language: string) => {
      const res = await apiRequest("PATCH", "/api/user/settings", { language });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t.success,
        description: t.settingsSaved,
      });
    },
  });

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#002E6E] mb-2">{t.settings}</h1>
        <p className="text-slate-500 text-lg">{t.chooseLanguage}</p>
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
                <h3 className="text-xl font-bold text-[#002E6E]">{t.globalLanguage}</h3>
                <p className="text-sm text-slate-400 font-serif italic">{t.chooseLanguage}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t.appLanguage}</Label>
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
                    {t.loading}
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
                <h3 className="text-2xl font-bold tracking-wide italic">{t.premium}</h3>
              </div>
              <p className="text-blue-200 mb-4">{t.subscription}</p>

              {/* Premium Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Unlimited Alarms & Routines</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Unlimited Medicine Reminders</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Unlimited Meeting Schedules</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">18+ Languages Voice Support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Custom Voice Recording</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Music & Vibration Alarms</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Photo Upload for Medicines</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm">Ad-Free Experience</span>
                </div>
              </div>

              {/* Current Plan Status */}
              <div className="bg-white/10 rounded-xl p-4 flex justify-between items-center mb-6 border border-white/5">
                <div>
                  <p className="text-sm text-blue-200">{t.currentPlan}</p>
                  <p className="font-bold text-lg">{user?.subscriptionStatus === 'active' ? t.premium : 'Free Trial'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${user?.subscriptionStatus === 'active' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                  {user?.subscriptionStatus === 'active' ? t.active : '1 Month Free'}
                </span>
              </div>

              {/* Pricing Options */}
              <div className="space-y-3">
                <Button className="w-full bg-white text-[#002E6E] hover:bg-blue-50 font-bold h-14 text-lg" data-testid="button-subscribe-monthly">
                  <div className="flex justify-between items-center w-full">
                    <span>Monthly</span>
                    <span className="num">₹45 / 30 Days</span>
                  </div>
                </Button>
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-[#002E6E] hover:from-yellow-500 hover:to-orange-500 font-bold h-14 text-lg relative overflow-hidden" data-testid="button-subscribe-yearly">
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-bl-lg font-bold">SAVE 31%</div>
                  <div className="flex justify-between items-center w-full">
                    <span>Yearly</span>
                    <span className="num">₹369 / Year</span>
                  </div>
                </Button>
              </div>

              <p className="text-center text-blue-200 text-xs mt-4">
                Start with 1 Month Free Trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
