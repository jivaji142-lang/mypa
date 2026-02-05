import { useState, useEffect } from "react";
import { Crown, AlertTriangle } from "lucide-react";
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

interface AdPopupProps {
  daysRemaining: number;
  onClose: () => void;
}

export function AdPopup({ daysRemaining, onClose }: AdPopupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(10);
  const [canClose, setCanClose] = useState(false);
  const [clickedPlan, setClickedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [countdown]);

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
              onClose();
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl max-w-md w-full p-6 relative shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Trial Ending Soon!</h2>
          <p className="text-white/90">
            Only <span className="font-bold text-yellow-300">{daysRemaining} days</span> left
          </p>
          <p className="text-white/80 text-sm mt-2">
            After trial ends, only your set alarms will ring.
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <p className="text-center text-white/90 text-sm">
            Subscribe now to keep full access to all features including medicines, meetings, and unlimited alarms.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleSubscribe('monthly')}
            disabled={clickedPlan === 'monthly' || razorpayOrderMutation.isPending}
            className="w-full bg-white text-orange-600 hover:bg-gray-100 py-6 text-lg font-bold"
            data-testid="button-subscribe-monthly-ad"
          >
            {clickedPlan === 'monthly' ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            ₹5/month
          </Button>
          <Button
            onClick={() => handleSubscribe('yearly')}
            disabled={clickedPlan === 'yearly' || razorpayOrderMutation.isPending}
            className="w-full bg-yellow-400 text-orange-800 hover:bg-yellow-300 py-6 text-lg font-bold"
            data-testid="button-subscribe-yearly-ad"
          >
            {clickedPlan === 'yearly' ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            ₹6/year
          </Button>
        </div>

        <button
          onClick={canClose ? onClose : undefined}
          className={`w-full text-center text-sm mt-4 py-2 rounded-lg ${
            canClose 
              ? "text-white/80 hover:text-white cursor-pointer" 
              : "text-white/50 cursor-not-allowed"
          }`}
          disabled={!canClose}
          data-testid="button-close-ad"
        >
          {canClose ? "Continue with limited access" : `Wait ${countdown}s to continue...`}
        </button>
      </div>
    </div>
  );
}
