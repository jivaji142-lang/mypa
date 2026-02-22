import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNativeSync } from "@/hooks/useNativeSync";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { saveToken } from "@/lib/tokenStorage";
import { initOfflineDB, clearExpiredDismissals } from "@/lib/offlineStorage";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

import Home from "@/pages/home";
import Routine from "@/pages/routine";
import Medicines from "@/pages/medicines";
import Meetings from "@/pages/meetings";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { GlobalAlarmHandler } from "@/components/global-alarm-handler";

function Router() {
  const { user, isLoading } = useAuth();
  useNativeSync();

  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();

  // Auto-subscribe push notifications when permission already granted but subscription lost
  useEffect(() => {
    if (!user || !isSupported || isSubscribed) return;
    if (permission === 'granted') {
      console.log('[App] Push permission already granted, auto-subscribing...');
      subscribe();
    }
  }, [user, isSupported, isSubscribed, permission, subscribe]);

  // Handle token from Google OAuth callback URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      saveToken(token);
      console.log('[App] Google OAuth token saved from URL');
      // Remove token from URL
      window.history.replaceState({}, '', '/');
      // Force re-fetch user
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, []);

  // Listen for deep link callback from native Google OAuth
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener("appUrlOpen", async (event) => {
      console.log("[App] Deep link received:", event.url);
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get("token");
        if (token) {
          saveToken(token);
          console.log("[App] Token saved from deep link");
          // Close the browser that opened for Google OAuth
          try { await Browser.close(); } catch (_) {}
          // Re-fetch user to trigger authenticated state
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (e) {
        console.error("[App] Failed to parse deep link:", e);
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-[#00BAF2] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/routine" component={Routine} />
        <Route path="/medicines" component={Medicines} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
      <GlobalAlarmHandler />
    </>
  );
}

// Initialize offline storage early
initOfflineDB()
  .then(() => clearExpiredDismissals())
  .catch((e) => console.warn('[App] Failed to initialize offline DB:', e));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <PushNotificationPrompt />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
