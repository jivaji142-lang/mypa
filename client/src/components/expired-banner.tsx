import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function ExpiredBanner() {
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
            onClick={() => monthlyPrice && checkoutMutation.mutate(monthlyPrice.price_id)}
            disabled={!monthlyPrice || checkoutMutation.isPending}
            className="w-full royal-gradient text-white py-6 text-lg"
            data-testid="button-subscribe-monthly-expired"
          >
            <Crown className="w-5 h-5 mr-2" />
            Subscribe ₹45/month
          </Button>
          <Button
            onClick={() => yearlyPrice && checkoutMutation.mutate(yearlyPrice.price_id)}
            disabled={!yearlyPrice || checkoutMutation.isPending}
            variant="outline"
            className="w-full border-2 border-[#002E6E] text-[#002E6E] py-6 text-lg"
            data-testid="button-subscribe-yearly-expired"
          >
            <Crown className="w-5 h-5 mr-2" />
            Subscribe ₹369/year
          </Button>
        </div>
      </div>
    </div>
  );
}
