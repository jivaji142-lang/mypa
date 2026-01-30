import type { Express } from "express";
import { authStorage } from "./storage";
import type { User } from "@shared/schema";

// Sanitize user response - remove sensitive fields
function sanitizeUser(user: User | undefined) {
  if (!user) return undefined;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user - works with both OIDC and Email/Password login
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Handle OIDC login (has claims.sub)
      if (req.user.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await authStorage.getUser(userId);
        return res.json(sanitizeUser(user));
      }
      
      // Handle Email/Password or Phone login (has id directly)
      if (req.user.id) {
        const user = await authStorage.getUser(req.user.id);
        return res.json(sanitizeUser(user));
      }
      
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
