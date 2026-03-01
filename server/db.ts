import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');
const isServerless = !!process.env.VERCEL;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Pool sizing — conservative for serverless (Neon free tier allows ~5 total)
  max: isServerless ? 3 : 10,
  min: 0,                           // no pre-allocated connections (critical for serverless)
  // Timeouts — fail fast on serverless
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  connectionTimeoutMillis: 5000,
  // No keepAlive on serverless (connections are ephemeral)
  keepAlive: !isServerless,
  keepAliveInitialDelayMillis: isServerless ? undefined : 10000,
  // SSL required for Neon and most cloud DBs
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
});

// CRITICAL: Handle pool errors to prevent unhandled 'error' event crashes
pool.on('error', (err) => {
  console.error('[DB] Pool connection error (non-fatal):', err.message);
  // Don't crash — the pool will automatically reconnect on next query
});

export const db = drizzle(pool, { schema });
