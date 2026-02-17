import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express } from "express";
import { authStorage } from "./storage";
import bcrypt from "bcryptjs";

/**
 * Setup Email/Password Passport strategy for non-Replit environments
 * (Vercel, local dev, etc.)
 *
 * NOTE: This ONLY sets up the passport strategy.
 * Route registration happens in server/routes.ts to avoid conflicts.
 */
export function setupLocalAuth(app: Express) {
  console.log('[Auth] Setting up Email/Password Passport strategy');

  // Local Strategy (email + password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await authStorage.getUserByEmail(email.toLowerCase());

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Verify password
          if (!user.passwordHash) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Return user (without password)
          return done(null, { id: user.id });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user (store user ID in session)
  passport.serializeUser((user: any, cb) => cb(null, user.id));

  // Deserialize user (retrieve user from session)
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await authStorage.getUser(id);
      cb(null, user ? { id: user.id } : null);
    } catch (error) {
      cb(error);
    }
  });

  console.log('[Auth] Passport local strategy configured');
  // NOTE: All route registration moved to server/routes.ts
}
