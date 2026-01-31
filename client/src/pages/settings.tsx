import { useState, useEffect } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/hooks/use-translations";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Check, Crown, LogOut, User, ExternalLink, Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
        window.open(data.url, '_blank');
      }
    },
  });

  const monthlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'month');
  const yearlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'year');
  
  const [clickedPlan, setClickedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const { data: razorpayKey } = useQuery<{ key: string }>({
    queryKey: ['/api/razorpay/key'],
  });

  const razorpayOrderMutation = useMutation({
    mutationFn: async (plan: 'monthly' | 'yearly') => {
      const res = await apiRequest("POST", "/api/razorpay/create-order", { plan });
      return res.json();
    },
    onSuccess: (data) => {
      if (!razorpayLoaded || !razorpayKey?.key) {
        toast({ title: "Error", description: "Payment system not ready", variant: "destructive" });
        return;
      }
      
      const options = {
        key: razorpayKey.key,
        amount: data.amount,
        currency: data.currency,
        name: "MyPA Premium",
        description: data.plan === 'yearly' ? "Yearly Subscription" : "Monthly Subscription",
        order_id: data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await apiRequest("POST", "/api/razorpay/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: data.plan
            });
            const result = await verifyRes.json();
            if (result.success) {
              toast({ title: "Success!", description: "Payment successful. Enjoy MyPA Premium!" });
              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            }
          } catch (err) {
            toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
          }
        },
        prefill: {
          name: user?.firstName || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: "#002E6E"
        },
        modal: {
          ondismiss: () => setClickedPlan(null)
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({ 
          title: "Payment Failed", 
          description: response.error?.description || "Payment could not be completed. Please try again.", 
          variant: "destructive" 
        });
        setClickedPlan(null);
      });
      rzp.open();
      setClickedPlan(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not start payment", variant: "destructive" });
      setClickedPlan(null);
    }
  });

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setClickedPlan(plan);
    razorpayOrderMutation.mutate(plan);
  };

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-[#002E6E] mb-1">{t.settings}</h1>
        <p className="text-slate-500">{t.chooseLanguage}</p>
      </div>

      {/* Account Section */}
      <div className="royal-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#002E6E] to-[#00BAF2] rounded-full flex items-center justify-center shadow-lg">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#002E6E]">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-slate-500 text-sm">{user?.email || user?.phone || 'User'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Language Settings */}
        <section>
          <div className="royal-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-[#00BAF2]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#002E6E]">{t.globalLanguage}</h3>
                <p className="text-xs text-slate-400 font-serif italic">{t.chooseLanguage}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t.appLanguage}</Label>
              <Select 
                value={user?.language || "english"} 
                onValueChange={(val) => mutation.mutate(val)}
                disabled={mutation.isPending}
              >
                <SelectTrigger className="royal-input h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mutation.isPending && (
                <div className="flex items-center gap-2 text-[#00BAF2] text-sm font-serif italic">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t.loading}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section>
          <div className="bg-gradient-to-br from-[#002E6E] to-[#001a40] rounded-2xl p-5 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-bold tracking-wide italic">{t.premium}</h3>
              </div>
              <p className="text-blue-200 text-sm mb-3">{t.subscription}</p>

              {/* Premium Features */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Unlimited Alarms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Medicine Reminders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Meeting Schedules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>18+ Languages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Voice Recording</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Music Alarms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Photo Upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span>Ad-Free</span>
                </div>
              </div>

              {/* Current Plan Status */}
              <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center mb-4 border border-white/5">
                <div>
                  <p className="text-xs text-blue-200">{t.currentPlan}</p>
                  <p className="font-bold">
                    {user?.subscriptionStatus === 'active' 
                      ? t.premium 
                      : user?.subscriptionStatus === 'trial' 
                        ? 'Free Trial' 
                        : 'Free Plan'}
                  </p>
                  {user?.subscriptionStatus === 'trial' && user?.trialEndsAt && (
                    <p className="text-xs text-blue-300">
                      Ends: {new Date(user.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
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
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-white text-[#002E6E] hover:bg-blue-50 font-bold h-11" 
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    data-testid="button-manage-subscription"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-white text-[#002E6E] hover:bg-blue-50 font-bold h-11" 
                    onClick={() => handleSubscribe('monthly')}
                    disabled={razorpayOrderMutation.isPending || !razorpayLoaded}
                    data-testid="button-subscribe-monthly"
                  >
                    {razorpayOrderMutation.isPending && clickedPlan === 'monthly' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>Monthly</span>
                        <span className="num">₹5 / 30 Days</span>
                      </div>
                    )}
                  </Button>
                  <Button 
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-[#002E6E] hover:from-yellow-500 hover:to-orange-500 font-bold h-11 relative overflow-hidden" 
                    onClick={() => handleSubscribe('yearly')}
                    disabled={razorpayOrderMutation.isPending || !razorpayLoaded}
                    data-testid="button-subscribe-yearly"
                  >
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-bl-lg font-bold">SAVE 31%</div>
                    {razorpayOrderMutation.isPending && clickedPlan === 'yearly' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span>Yearly</span>
                        <span className="num">₹6 / Year</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}

              <p className="text-center text-blue-200 text-[10px] mt-3">
                {user?.subscriptionStatus === 'active' 
                  ? 'Manage billing, update payment method, or cancel anytime' 
                  : 'Start with 1 Month Free Trial • Cancel anytime'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Home Shortcut - Top Right */}
      <Link href="/" data-testid="link-home-fab">
        <div className="fixed top-20 lg:top-6 right-6 w-12 h-12 royal-gradient rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 z-50">
          <Home className="w-5 h-5 text-white" />
        </div>
      </Link>
    </Layout>
  );
}
