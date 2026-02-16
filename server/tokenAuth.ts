/**
 * JWT Token-Based Authentication
 *
 * This replaces session cookies for mobile app compatibility.
 * Works with HTTP dev server + HTTPS production API.
 *
 * Flow:
 * 1. Login → Returns JWT token
 * 2. Client stores token in localStorage
 * 3. All API calls include: Authorization: Bearer <token>
 * 4. Server verifies token on each request
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { authStorage } from './replit_integrations/auth/storage';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const TOKEN_EXPIRY = '7d'; // 7 days

interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as TokenPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware: Require valid JWT token
 */
export const requireToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  // Attach user info to request
  (req as any).user = { id: payload.userId };
  next();
};

/**
 * Login endpoint (token-based)
 */
export async function handleTokenLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    // Find user by email
    const user = await authStorage.getUserByEmail(email.toLowerCase());

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return token and user data
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    console.error('[Token Auth] Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get current user from token
 */
export async function handleGetTokenUser(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await authStorage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error: any) {
    console.error('[Token Auth] Get user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Helper: Check if request is authenticated (session OR token)
 *
 * PRODUCTION-READY MULTI-USER AUTHENTICATION
 * Supports both session-based and token-based auth
 */
export function isAuthenticatedAny(req: Request): boolean {
  // Check session-based auth (passport)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return true; // User from session
  }

  // Check token-based auth (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      // Attach user to request (compatible with session auth)
      (req as any).user = { id: payload.userId };
      return true; // User from valid token
    }
  }

  // No valid authentication found
  return false;
}

/**
 * Helper: Get user ID from request (session OR token)
 * Returns null if user is not authenticated
 */
export function getUserId(req: Request): string | null {
  // Try to ensure auth first
  if (!isAuthenticatedAny(req)) {
    return null;
  }

  // Return authenticated user ID
  return (req as any).user?.id || null;
}
