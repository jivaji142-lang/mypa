import { useState, useEffect } from "react";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function ExpiredBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clickedPlan, setClickedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      setRazorpayLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
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
        toast({ title: "Error", description: "Payment system not ready. Please wait and try again.", variant: "destructive" });
        setClickedPlan(null);
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
      toast({ title: "Error", description: "Could not start payment. Please try again.", variant: "destructive" });
      setClickedPlan(null);
    }
  });

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    setClickedPlan(plan);
    razorpayOrderMutation.mutate(plan);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Trial Expired</h2>
        <p className="text-gray-600 mb-6">
          Your 30-day free trial has ended. Only your existing alarms will continue to ring. Subscribe to unlock all features.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">Limited Mode Active:</p>
          <p className="text-gray-700">
            Your set alarms, medicine reminders, and meeting alerts will still ring based on your settings.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleSubscribe('monthly')}
            disabled={clickedPlan === 'monthly' || razorpayOrderMutation.isPending}
            className="w-full royal-gradient text-white py-6 text-lg"
            data-testid="button-subscribe-monthly-expired"
          >
            {clickedPlan === 'monthly' ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            Subscribe ₹5/month
          </Button>
          <Button
            onClick={() => handleSubscribe('yearly')}
            disabled={clickedPlan === 'yearly' || razorpayOrderMutation.isPending}
            variant="outline"
            className="w-full border-2 border-[#002E6E] text-[#002E6E] py-6 text-lg"
            data-testid="button-subscribe-yearly-expired"
          >
            {clickedPlan === 'yearly' ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            Subscribe ₹6/year
          </Button>
        </div>
      </div>
    </div>
  );
}
