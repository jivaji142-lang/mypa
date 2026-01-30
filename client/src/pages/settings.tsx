import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/hooks/use-translations";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Check, Crown, LogOut, User, ExternalLink } from "lucide-react";
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

  const { data: productsData } = useQuery<{ products: { price_id: string; unit_amount: number; recurring: { interval: string } }[] }>({
    queryKey: ["/api/stripe/products"],
  });

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

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const monthlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'month');
  const yearlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'year');

  const handleSubscribe = (priceId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    checkoutMutation.mutate(priceId);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#002E6E] mb-2">{t.settings}</h1>
        <p className="text-slate-500 text-lg">{t.chooseLanguage}</p>
      </div>

      {/* Account Section */}
      <div className="royal-card p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#002E6E] to-[#00BAF2] rounded-full flex items-center justify-center shadow-lg">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#002E6E]">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-slate-500 text-sm">{user?.email || user?.phone || 'User'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
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
                  <p className="font-bold text-lg">
                    {user?.subscriptionStatus === 'active' 
                      ? t.premium 
                      : user?.subscriptionStatus === 'trial' 
                        ? 'Free Trial' 
                        : 'Free Plan'}
                  </p>
                  {user?.subscriptionStatus === 'trial' && user?.trialEndsAt && (
                    <p className="text-xs text-blue-300 mt-1">
                      Ends: {new Date(user.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                  user?.subscriptionStatus === 'active' 
                    ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                    : user?.subscriptionStatus === 'trial'
                      ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                      : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                }`}>
                  {user?.subscriptionStatus === 'active' 
                    ? t.active 
                    : user?.subscriptionStatus === 'trial' 
                      ? '30 Days Free' 
                      : 'Upgrade'}
                </span>
              </div>

              {/* Pricing Options */}
              {user?.subscriptionStatus === 'active' || (user?.subscriptionStatus === 'trial' && user?.stripeSubscriptionId) ? (
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-white text-[#002E6E] hover:bg-blue-50 font-bold h-14 text-lg" 
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-subscription"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-5 h-5 mr-2" />
                    )}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-white text-[#002E6E] hover:bg-blue-50 font-bold h-14 text-lg" 
                    onClick={() => monthlyPrice && handleSubscribe(monthlyPrice.price_id)}
                    disabled={checkoutMutation.isPending || !monthlyPrice}
                    data-testid="button-subscribe-monthly"
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>Monthly</span>
                        <span className="num">₹45 / 30 Days</span>
                      </div>
                    )}
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-[#002E6E] hover:from-yellow-500 hover:to-orange-500 font-bold h-14 text-lg relative overflow-hidden" 
                    onClick={() => yearlyPrice && handleSubscribe(yearlyPrice.price_id)}
                    disabled={checkoutMutation.isPending || !yearlyPrice}
                    data-testid="button-subscribe-yearly"
                  >
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-bl-lg font-bold">SAVE 31%</div>
                    {checkoutMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>Yearly</span>
                        <span className="num">₹369 / Year</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}

              <p className="text-center text-blue-200 text-xs mt-4">
                {user?.subscriptionStatus === 'active' 
                  ? 'Manage billing, update payment method, or cancel anytime' 
                  : 'Start with 1 Month Free Trial • Cancel anytime'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
