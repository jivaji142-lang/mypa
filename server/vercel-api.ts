/**
 * Vercel Serverless Function — Source file
 *
 * This gets compiled by esbuild into api/index.mjs
 * DO NOT put this in the api/ folder directly.
 */
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { createServer } from "http";

const app = express();

// ═══════════════════════════════════════════════════════════════
// CORS Configuration - CRITICAL for Mobile App
// ═══════════════════════════════════════════════════════════════
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins (Vercel handles production security via edge)
    callback(null, true);
  },
  credentials: true,  // CRITICAL: Allow cookies for session
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

console.log('[CORS] Enabled for Vercel serverless');

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Enable ETag for automatic client caching
app.set('etag', 'weak');
app.set("trust proxy", 1);

// Body parsers
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (duration > 500) {
        logLine = `⚠️ SLOW ${logLine}`;
      }
      console.log(logLine);
    }
  });

  next();
});

// Register all routes (lazy init for serverless cold start)
const httpServer = createServer(app);
let isRoutesRegistered = false;
let routesError: Error | null = null;

async function ensureRoutes() {
  if (isRoutesRegistered) return;
  if (routesError) throw routesError;
  
  try {
    await registerRoutes(httpServer, app);
    
    // Error handler (must be after all routes)
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server Error:", err.message || err);
      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });
    
    isRoutesRegistered = true;
    console.log('[Vercel] Routes registered successfully');
  } catch (err: any) {
    routesError = err;
    console.error('[Vercel] Failed to register routes:', err.message || err);
    throw err;
  }
}

// Start route registration immediately (for warm starts)
const routesPromise = ensureRoutes().catch(() => {});

// Export for Vercel serverless
export default async function handler(req: any, res: any) {
  try {
    await ensureRoutes();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel] Handler error:', err.message || err);
    res.status(500).json({ 
      error: 'Server initialization failed',
      message: err.message || 'Unknown error',
      hint: 'Check Environment Variables (DATABASE_URL, SESSION_SECRET) in Vercel Dashboard → Settings'
    });
  }
}

