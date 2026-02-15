import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express } from "express";
import { authStorage } from "./storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Setup Email/Password authentication for non-Replit environments
 * (Vercel, local dev, etc.)
 */
export function setupLocalAuth(app: Express) {
  console.log('[Auth] Setting up Email/Password authentication');

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

  // ═══════════════════════════════════════════════════════════════
  // POST /api/auth/register - Create new account
  // ═══════════════════════════════════════════════════════════════
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await authStorage.upsertUser({
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || "",
        lastName: lastName || "",
        profileImageUrl: "",
      });

      // Log in user automatically
      req.login({ id: user.id }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }

        // Return user (without password)
        const { passwordHash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/auth/login - Login with email/password
  // ═══════════════════════════════════════════════════════════════
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication failed" });
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // Log in user (create session)
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }

        // Return success
        res.json({ message: "Login successful" });
      });
    })(req, res, next);
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/auth/logout - Logout user
  // ═══════════════════════════════════════════════════════════════
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
}
