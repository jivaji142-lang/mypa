import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { authStorage } from "./storage";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Setup Google OAuth 2.0 Passport strategy
 * Works on Vercel, local dev, and mobile app
 */
export function setupGoogleAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

  if (!clientID || !clientSecret) {
    console.log('[Google Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google login disabled');
    return false;
  }

  // Register Google OAuth strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ["openid", "email", "profile"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          // Check if user already exists by email
          let user = await authStorage.getUserByEmail(email);

          if (user) {
            // Update existing user with Google profile info
            const [updatedUser] = await db
              .update(users)
              .set({
                firstName: profile.name?.givenName || user.firstName,
                lastName: profile.name?.familyName || user.lastName,
                profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
                authProvider: "google",
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id))
              .returning();
            return done(null, { id: updatedUser.id });
          }

          // Create new user
          const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial
          const [newUser] = await db
            .insert(users)
            .values({
              email: email,
              firstName: profile.name?.givenName || email.split("@")[0],
              lastName: profile.name?.familyName || "",
              profileImageUrl: profile.photos?.[0]?.value || null,
              authProvider: "google",
              subscriptionStatus: "trial",
              trialEndsAt,
            })
            .returning();

          console.log(`[Google Auth] New user created: ${email}`);
          return done(null, { id: newUser.id });
        } catch (error) {
          console.error("[Google Auth] Error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  console.log('[Google Auth] Strategy registered successfully');
  return true;
}
