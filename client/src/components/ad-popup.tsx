import { useState, useEffect } from "react";
import { Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AdPopupProps {
  daysRemaining: number;
  onClose: () => void;
}

export function AdPopup({ daysRemaining, onClose }: AdPopupProps) {
  const [countdown, setCountdown] = useState(10);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [countdown]);

  const { data: productsData } = useQuery<{ products: { price_id: string; unit_amount: number; recurring: { interval: string } }[] }>({
    queryKey: ["/api/stripe/products"],
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
  });

  const monthlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'month');
  const yearlyPrice = productsData?.products?.find(p => p.recurring?.interval === 'year');

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
            onClick={() => monthlyPrice && checkoutMutation.mutate(monthlyPrice.price_id)}
            disabled={!monthlyPrice || checkoutMutation.isPending}
            className="w-full bg-white text-orange-600 hover:bg-gray-100 py-6 text-lg font-bold"
            data-testid="button-subscribe-monthly-ad"
          >
            <Crown className="w-5 h-5 mr-2" />
            ₹5/month
          </Button>
          <Button
            onClick={() => yearlyPrice && checkoutMutation.mutate(yearlyPrice.price_id)}
            disabled={!yearlyPrice || checkoutMutation.isPending}
            className="w-full bg-yellow-400 text-orange-800 hover:bg-yellow-300 py-6 text-lg font-bold"
            data-testid="button-subscribe-yearly-ad"
          >
            <Crown className="w-5 h-5 mr-2" />
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
