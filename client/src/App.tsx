import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNativeSync } from "@/hooks/useNativeSync";
import { Loader2 } from "lucide-react";

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
