import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveToken } from "@/lib/tokenStorage";
import { getApiUrl } from "@/lib/config";

export default function Login() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: "", password: "", name: "" });

  const emailAuth = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string; isSignup: boolean }) => {
      const endpoint = data.isSignup ? "/api/auth/signup" : "/api/auth/token-login";
      const { isSignup: _, ...body } = data;
      if (!data.isSignup) {
        delete body.name;
      }
      const res = await fetch(getApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error("This email is already registered. Please sign in instead.");
        }
        throw new Error(error.message || "Authentication failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        saveToken(data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    emailAuth.mutate({
      email: emailForm.email,
      password: emailForm.password,
      name: emailForm.name,
      isSignup
    });
  };

  return (
    <div className="min-h-screen royal-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl border-0">
        <CardHeader className="text-center pt-8 pb-2">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-[#002E6E] to-[#00BAF2] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Bell className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#002E6E] italic">MyPA</CardTitle>
          <p className="text-slate-500 italic">Your Personal Assistant</p>
        </CardHeader>

        <CardContent className="space-y-4 pb-8 px-6">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label className="text-slate-700">Full Name</Label>
                <Input
                  placeholder="Your name"
                  value={emailForm.name}
                  onChange={e => setEmailForm({ ...emailForm, name: e.target.value })}
                  className="h-11 bg-white text-slate-900 border-slate-300"
                  data-testid="input-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-700">Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={emailForm.email}
                onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                required
                className="h-11 bg-white text-slate-900 border-slate-300"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={emailForm.password}
                  onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                  required
                  className="h-11 pr-10 bg-white text-slate-900 border-slate-300"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={emailAuth.isPending}
              className="w-full h-11 bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-bold"
              data-testid="button-email-submit"
            >
              {emailAuth.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isSignup ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-[#00BAF2] hover:underline"
              data-testid="button-toggle-signup"
            >
              {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="pt-4 border-t text-center text-xs text-slate-400">
            By continuing, you agree to our Terms of Service
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
