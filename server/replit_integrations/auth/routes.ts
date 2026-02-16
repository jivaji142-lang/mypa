import type { Express } from "express";
import { authStorage } from "./storage";
import type { User } from "@shared/schema";
import { isAuthenticatedAny, getUserId } from "../../tokenAuth";

// Sanitize user response - remove sensitive fields
function sanitizeUser(user: User | undefined) {
  if (!user) return undefined;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// In-memory user cache: avoids hitting remote DB on every /api/auth/user call
// Cache TTL: 60 seconds — user data rarely changes
const userCache = new Map<string, { user: any; expiry: number }>();
const USER_CACHE_TTL = 60 * 1000; // 60 seconds

function getCachedUser(userId: string): any | null {
  const entry = userCache.get(userId);
  if (entry && Date.now() < entry.expiry) {
    return entry.user;
  }
  userCache.delete(userId);
  return null;
}

function setCachedUser(userId: string, user: any): void {
  userCache.set(userId, { user, expiry: Date.now() + USER_CACHE_TTL });
}

// Call this when user settings are updated to invalidate cache
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user - works with both OIDC and Email/Password login
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // AUTHENTICATION DISABLED: Always allow (no 401)
      if (!isAuthenticatedAny(req)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user ID (supports session/token OR default test user)
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check cache first (avoids ~200-400ms remote DB query)
      const cached = getCachedUser(userId);
      if (cached) {
        return res.json(cached);
      }

      // Cache miss — fetch from DB
      const user = await authStorage.getUser(userId);
      const sanitized = sanitizeUser(user);
      
      if (sanitized) {
        setCachedUser(userId, sanitized);
      }
      
      return res.json(sanitized);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
