import { useAuth } from "./use-auth";

export type TrialStatus = 
  | "active_trial"      // Day 1-14: Full access
  | "show_popup"        // Day 15-24: Skippable premium popup
  | "show_ads"          // Day 25-29: Unskippable ads
  | "expired"           // Day 30+: Alarm-only mode
  | "subscribed"        // Active subscription
  | "loading";

export function useTrialStatus() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return { status: "loading" as TrialStatus, daysRemaining: 30, dayNumber: 0 };
  }

  if (!user) {
    return { status: "loading" as TrialStatus, daysRemaining: 30, dayNumber: 0 };
  }

  if (user.subscriptionStatus === "active") {
    return { status: "subscribed" as TrialStatus, daysRemaining: 0, dayNumber: 0 };
  }

  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  
  if (!trialEndsAt) {
    return { status: "active_trial" as TrialStatus, daysRemaining: 30, dayNumber: 1 };
  }

  const now = new Date();
  const trialStartDate = new Date(trialEndsAt);
  trialStartDate.setDate(trialStartDate.getDate() - 30);
  
  const diffMs = now.getTime() - trialStartDate.getTime();
  const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = Math.max(0, 30 - dayNumber + 1);

  let status: TrialStatus;

  if (dayNumber <= 14) {
    status = "active_trial";
  } else if (dayNumber <= 24) {
    status = "show_popup";
  } else if (dayNumber <= 29) {
    status = "show_ads";
  } else {
    status = "expired";
  }

  return { status, daysRemaining, dayNumber };
}
