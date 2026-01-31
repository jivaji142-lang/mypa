import { useState } from "react";
import { X, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TrialPopupProps {
  daysRemaining: number;
  onClose: () => void;
}

export function TrialPopup({ daysRemaining, onClose }: TrialPopupProps) {
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          data-testid="button-close-popup"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 royal-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#002E6E] mb-2">Upgrade to Premium</h2>
          <p className="text-gray-600">
            Your trial ends in <span className="font-bold text-orange-500">{daysRemaining} days</span>
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {["Unlimited alarms & reminders", "Medicine tracking with photos", "Meeting scheduler", "18+ languages support", "Custom voice recordings"].map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => monthlyPrice && checkoutMutation.mutate(monthlyPrice.price_id)}
            disabled={!monthlyPrice || checkoutMutation.isPending}
            className="w-full royal-gradient text-white py-6 text-lg"
            data-testid="button-subscribe-monthly-popup"
          >
            ₹45/month
          </Button>
          <Button
            onClick={() => yearlyPrice && checkoutMutation.mutate(yearlyPrice.price_id)}
            disabled={!yearlyPrice || checkoutMutation.isPending}
            variant="outline"
            className="w-full border-2 border-[#002E6E] text-[#002E6E] py-6 text-lg"
            data-testid="button-subscribe-yearly-popup"
          >
            ₹369/year (Save 32%)
          </Button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-gray-500 text-sm mt-4 hover:text-gray-700"
          data-testid="button-skip-popup"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
