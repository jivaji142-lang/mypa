import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, Phone, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import { saveToken } from "@/lib/tokenStorage";

export default function Login() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [emailForm, setEmailForm] = useState({ email: "", password: "", name: "" });
  const [phoneForm, setPhoneForm] = useState({ phone: "", otp: "", name: "" });
  const [otpSent, setOtpSent] = useState(false);

  // Handle Google OAuth redirect with token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error === 'google_auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "Google login failed. Please try again.",
        variant: "destructive"
      });
      // Clean URL
      window.history.replaceState({}, '', '/login');
    } else if (token) {
      saveToken(token);
      console.log('[Login] Google OAuth token saved');
      // Invalidate user query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clean URL and redirect to home
      window.location.href = "/";
    }
  }, [toast]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  const emailAuth = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string; isSignup: boolean }) => {
      // Use token-login for authentication (returns JWT token)
      const endpoint = data.isSignup ? "/api/auth/signup" : "/api/auth/token-login";
      const res = await apiRequest("POST", endpoint, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Authentication failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Save JWT token to localStorage
      if (data.token) {
        saveToken(data.token);
        console.log('[Login] Token saved to localStorage');
      }

      // Invalidate user query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Redirect to home page after successful login
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const sendOtp = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", { phone });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send OTP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setOtpSent(true);
      if (data.dev_otp) {
        // SMS not configured — auto-fill OTP and show it to user
        setPhoneForm(prev => ({ ...prev, otp: data.dev_otp }));
        toast({
          title: "OTP (Test Mode)",
          description: `Your OTP is: ${data.dev_otp}`,
          duration: 30000,
        });
      } else {
        toast({ title: "OTP Sent", description: "Check your phone for the verification code" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const verifyOtp = useMutation({
    mutationFn: async (data: { phone: string; otp: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Invalid OTP");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Save JWT token to localStorage
      if (data.token) {
        saveToken(data.token);
        console.log('[Login] Phone OTP - Token saved to localStorage');
      }

      // Invalidate user query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      // Redirect to home page after successful login
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

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      sendOtp.mutate(phoneForm.phone);
    } else {
      verifyOtp.mutate({ phone: phoneForm.phone, otp: phoneForm.otp, name: phoneForm.name });
    }
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
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="google" className="text-xs" data-testid="tab-google">
                <SiGoogle className="w-3 h-3 mr-1" /> Google
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs" data-testid="tab-email">
                <Mail className="w-3 h-3 mr-1" /> Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="text-xs" data-testid="tab-phone">
                <Phone className="w-3 h-3 mr-1" /> Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-4">
              <div className="text-center text-sm text-slate-600 space-y-1 mb-4">
                <p>Quick and secure sign in</p>
                <p>with your Google account</p>
              </div>
              <Button 
                onClick={handleGoogleLogin}
                className="w-full h-12 text-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium shadow-sm"
                data-testid="button-google-login"
              >
                <SiGoogle className="w-5 h-5 mr-3 text-[#4285F4]" />
                Continue with Google
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="phone" className="space-y-4">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Phone Number</Label>
                  <Input 
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phoneForm.phone}
                    onChange={e => setPhoneForm({ ...phoneForm, phone: e.target.value })}
                    required
                    disabled={otpSent}
                    className="h-11 bg-white text-slate-900 border-slate-300"
                    data-testid="input-phone"
                  />
                </div>
                
                {otpSent && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Enter OTP</Label>
                      <Input 
                        type="text"
                        placeholder="123456"
                        value={phoneForm.otp}
                        onChange={e => setPhoneForm({ ...phoneForm, otp: e.target.value })}
                        required
                        maxLength={6}
                        className="h-11 text-center text-xl tracking-widest font-bold bg-white text-slate-900 border-slate-300"
                        data-testid="input-otp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">Your Name</Label>
                      <Input 
                        placeholder="Your name"
                        value={phoneForm.name}
                        onChange={e => setPhoneForm({ ...phoneForm, name: e.target.value })}
                        className="h-11 bg-white text-slate-900 border-slate-300"
                        data-testid="input-phone-name"
                      />
                    </div>
                  </>
                )}
                
                <Button 
                  type="submit"
                  disabled={sendOtp.isPending || verifyOtp.isPending}
                  className="w-full h-11 bg-[#002E6E] hover:bg-[#002E6E]/90 text-white font-bold"
                  data-testid="button-phone-submit"
                >
                  {(sendOtp.isPending || verifyOtp.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {otpSent ? "Verify OTP" : "Send OTP"}
                </Button>
                
                {otpSent && (
                  <button 
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-sm text-[#00BAF2] hover:underline"
                    data-testid="button-change-phone"
                  >
                    Change phone number
                  </button>
                )}
              </form>
              
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t text-center text-xs text-slate-400">
            By continuing, you agree to our Terms of Service
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
