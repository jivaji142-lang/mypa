import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

const app = express();
const httpServer = createServer(app);

// ═══════════════════════════════════════════════════════════════
// CORS Configuration - CRITICAL for Mobile App
// ═══════════════════════════════════════════════════════════════
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in development
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // In production, allow these origins:
    const allowedOrigins = [
      'https://mypa-liard.vercel.app',
      'http://localhost:8080',
      'http://localhost:5173',
      'capacitor://localhost',  // Capacitor iOS
      'http://localhost',        // Capacitor Android
    ];

    // Allow any localhost IP (for mobile app development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('10.')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Still allow it but log for debugging
      console.log('[CORS] Allowing origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,  // CRITICAL: Allow cookies for session
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

console.log('[CORS] Enabled with credentials support');

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  // Skip Stripe entirely if no secret key is configured
  if (!stripeKey) {
    console.log('[Stripe] STRIPE_SECRET_KEY not found, skipping Stripe init');
    return;
  }
  
  if (!databaseUrl) {
    console.log('[Stripe] DATABASE_URL not found, skipping Stripe init');
    return;
  }

  try {
    console.log('[Stripe] Initializing schema...');
    await runMigrations({ databaseUrl } as any);
    console.log('[Stripe] Schema ready');

    const stripeSync = await getStripeSync();

    console.log('[Stripe] Setting up webhook...');
    const domain = process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
    if (domain) {
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `https://${domain}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`[Stripe] Webhook configured: ${result.webhook.url}`);
        } else {
          console.log('[Stripe] Webhook created but no URL returned');
        }
      } catch (webhookErr: any) {
        console.log('[Stripe] Webhook setup skipped:', webhookErr.message);
      }
    }

    stripeSync.syncBackfill()
      .then(() => console.log('[Stripe] Data synced'))
      .catch((err: any) => console.error('[Stripe] Sync error:', err));
  } catch (error) {
    console.error('[Stripe] Init error:', error);
  }
}

// Initialize Stripe in background — don't block server startup!
initStripe().catch((err) => console.error('[Stripe] Background init error:', err));

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('[Stripe] Webhook body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[Stripe] Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Enable ETag for automatic client caching (304 Not Modified)
app.set('etag', 'weak');

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Only log small responses to avoid slow JSON.stringify on large arrays
      if (capturedJsonResponse) {
        const bodyStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${bodyStr.length > 200 ? bodyStr.slice(0, 200) + '...' : bodyStr}`;
      }

      // Warn on slow API calls
      if (duration > 500) {
        logLine = `⚠️ SLOW ${logLine}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
