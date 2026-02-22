import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { authStorage } from "./storage";
import { pool } from "../../db";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';

  // Use MemoryStore for development (fast, no remote DB hit)
  // Use PG store for production (persistent across restarts & serverless invocations)
  let store: session.Store;

  if (isProduction && process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    store = new pgStore({
      pool: pool,                   // Reuse the app's existing PG pool (has SSL configured)
      createTableIfMissing: true,
      ttl: sessionTtl / 1000,       // CRITICAL FIX: TTL in SECONDS, not milliseconds!
      tableName: "sessions",
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 min
      errorLog: (err: any) => console.error('[Session Store] Error:', err),
    });
    console.log('[Session] Using PostgreSQL session store (shared pool)');
  } else {
    const MemoryStore = createMemoryStore(session);
    store = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    console.log('[Session] Using in-memory session store (fast dev mode)');
  }

  // CRITICAL FIX for Android WebView cross-origin cookies:
  // - httpOnly: false (allows JavaScript access for debugging cookie storage)
  // - secure: true (required for SameSite=None in modern browsers)
  // - sameSite: 'none' (required for cross-origin requests from mobile app)
  // - This is the ONLY valid combination for WebView cross-origin auth

  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    store,
    resave: false,              // Don't save session if unmodified (reduces DB writes)
    saveUninitialized: false,   // Don't create session until something stored (GDPR friendly)
    rolling: true,              // CRITICAL FIX: Reset maxAge on every request (keeps session alive)
    proxy: true,                // CRITICAL: Always trust proxy (required for Vercel HTTPS detection)
    name: 'connect.sid',        // Explicit session cookie name
    cookie: {
      httpOnly: false,          // CRITICAL: false for WebView debugging (can check document.cookie)
      secure: true,             // CRITICAL: true required for SameSite=None (API is HTTPS)
      sameSite: 'none',         // CRITICAL: 'none' required for cross-origin (app → API)
      maxAge: sessionTtl,
      path: '/',                // Cookie available on all routes
      // CRITICAL: No domain restriction for cross-origin cookie support (mobile app)
      domain: undefined,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Use Email/Password auth if not running on Replit
  if (!process.env.REPL_ID) {
    console.log('[Auth] Running outside Replit — setting up Local + Google auth');
    const { setupLocalAuth } = await import('./localAuth');
    setupLocalAuth(app);

    // Setup Google OAuth (works on Vercel, local dev, and mobile)
    const { setupGoogleAuth } = await import('./googleAuth');
    const googleEnabled = setupGoogleAuth(app);

    if (googleEnabled) {
      // Serialize/deserialize for Google OAuth sessions
      passport.serializeUser((user: any, cb) => cb(null, user.id));
      passport.deserializeUser(async (id: string, cb) => {
        try {
          const user = await authStorage.getUser(id);
          cb(null, user ? { id: user.id } : null);
        } catch (error) {
          cb(error);
        }
      });

      // Google OAuth routes
      app.get("/api/login", (req, res, next) => {
        const isMobile = req.query.mobile === "true";
        passport.authenticate("google", {
          scope: ["openid", "email", "profile"],
          prompt: "select_account",
          state: isMobile ? "mobile" : "web",
        })(req, res, next);
      });

      app.get("/api/auth/google/callback", (req, res, next) => {
        passport.authenticate("google", {
          failureRedirect: "/login?error=google_auth_failed",
        })(req, res, async (err?: any) => {
          if (err) {
            console.error("[Google Auth] Callback error:", err);
            return res.redirect("/login?error=google_auth_failed");
          }

          // Generate JWT token for the authenticated user
          const userId = (req.user as any)?.id;
          const isMobile = req.query.state === "mobile";
          if (userId) {
            try {
              const { generateToken } = await import('../../tokenAuth');
              const user = await authStorage.getUser(userId);
              if (user) {
                const token = generateToken(user.id, user.email || user.id);
                // Mobile: serve HTML page that triggers deep link
                if (isMobile) {
                  const deepLink = `com.mypa.app://auth-callback?token=${encodeURIComponent(token)}`;
                  return res.send(`<!DOCTYPE html><html><head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width,initial-scale=1">
                    <title>Logging in...</title>
                    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#002E6E;text-align:center;}</style>
                  </head><body>
                    <div>
                      <h2>Login Successful!</h2>
                      <p>Returning to MyPA app...</p>
                      <p style="margin-top:16px"><a href="${deepLink}" style="color:#00BAF2;font-weight:bold;font-size:18px;">Tap here if not redirected</a></p>
                    </div>
                    <script>
                      setTimeout(function(){ window.location.href = "${deepLink}"; }, 500);
                    </script>
                  </body></html>`);
                }
                // Web: redirect with token as query param (frontend will save it)
                return res.redirect(`/?token=${token}`);
              }
            } catch (error) {
              console.error("[Google Auth] Token generation error:", error);
            }
          }
          return res.redirect("/");
        });
      });

      app.get("/api/logout", (req, res) => {
        req.logout(() => {
          res.redirect("/login");
        });
      });

      console.log('[Auth] Google OAuth routes registered: /api/login, /api/auth/google/callback, /api/logout');
    }

    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user = { id: claims["sub"] };
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
