# Clean Authentication Architecture - Research-Based Implementation

## Research Summary

Based on best practices from 2024-2025 documentation:

### Key Findings:
1. **Token Storage**: For production mobile apps, use Capacitor Secure Storage (iOS Keychain/Android Keystore). For development, localStorage is acceptable.
2. **Token Lifespan**: Access tokens should be short-lived (5-15 mins), refresh tokens longer (7 days).
3. **Mobile Auth**: JWT tokens are more reliable than cookies in WebView/Capacitor apps.
4. **Security**: Always use HTTPS, validate tokens on every request, store secrets in environment variables.

---

## Current Architecture Analysis

### What Works:
✅ **Google OAuth** (replitAuth.ts)
- Uses Passport.js with session-based auth
- Works perfectly for web
- Keep this UNCHANGED

### What's Broken:
❌ **Email/Password** - Duplicate implementations:
- `localAuth.ts` has `/api/auth/login` (session-only)
- `routes.ts` has `/api/auth/login` (token-only)
- Conflicts and confusion

❌ **Phone OTP** - Missing token support:
- Creates session but doesn't return JWT
- Mobile app can't persist authentication

---

## New Clean Architecture

### Authentication Flow Types:

```
┌──────────────────────────────────────────────────────────┐
│                    Authentication Methods                  │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  1. Google OAuth (Web Only)                               │
│     - Session-based                                        │
│     - Passport.js                                          │
│     - KEEP UNCHANGED                                       │
│                                                            │
│  2. Email/Password (Web + Mobile)                         │
│     - JWT Token-based                                      │
│     - Works in WebView                                     │
│     - NEW UNIFIED IMPLEMENTATION                           │
│                                                            │
│  3. Phone OTP (Web + Mobile)                              │
│     - JWT Token-based                                      │
│     - Works in WebView                                     │
│     - NEW UNIFIED IMPLEMENTATION                           │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### Backend Structure:

```
server/
├── replit_integrations/
│   └── auth/
│       ├── replitAuth.ts         ← Google OAuth (UNCHANGED)
│       ├── localAuth.ts          ← DELETE (redundant)
│       ├── storage.ts            ← User DB operations (KEEP)
│       └── routes.ts             ← /api/auth/user endpoint (KEEP)
│
├── tokenAuth.ts                  ← JWT functions (ENHANCE)
│
└── routes.ts                     ← All auth endpoints (CONSOLIDATE HERE)
    ├── /api/auth/signup          ← Email signup → JWT token
    ├── /api/auth/token-login     ← Email login → JWT token
    ├── /api/auth/send-otp        ← Phone OTP send
    ├── /api/auth/verify-otp      ← Phone OTP verify → JWT token
    └── All data endpoints use:
        - isAuthenticatedAny()    ← Checks JWT OR session
        - getUserId()             ← Gets user from JWT OR session
```

---

## Implementation Plan

### Step 1: Enhance tokenAuth.ts

```typescript
// Enhanced JWT token system with proper TypeScript types

interface TokenPayload {
  userId: string;
  email?: string;
  phone?: string;
  authProvider: 'email' | 'phone' | 'google';
}

// Generate access token (short-lived)
function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

// Generate refresh token (long-lived)
function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify and decode token
function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Middleware: Check JWT OR session authentication
function isAuthenticatedAny(req: Request): boolean {
  // 1. Check session (for Google OAuth)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return true;
  }

  // 2. Check JWT token (for Email/Phone)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as any).user = { id: payload.userId };
      return true;
    }
  }

  return false;
}

// Get user ID from request
function getUserId(req: Request): string | null {
  if (!isAuthenticatedAny(req)) return null;
  return (req as any).user?.id || null;
}
```

### Step 2: Consolidate Auth Endpoints in routes.ts

```typescript
// ═══════════════════════════════════════════════════════
// EMAIL/PASSWORD AUTHENTICATION (JWT-based)
// ═══════════════════════════════════════════════════════

// POST /api/auth/signup - Create account + return token
app.post("/api/auth/signup", async (req, res) => {
  // 1. Validate input
  // 2. Check if email exists
  // 3. Hash password
  // 4. Create user
  // 5. Generate JWT token
  // 6. Return: { token, user }
});

// POST /api/auth/token-login - Login + return token
app.post("/api/auth/token-login", async (req, res) => {
  // 1. Validate credentials
  // 2. Verify password
  // 3. Generate JWT token
  // 4. Return: { token, user }
});

// ═══════════════════════════════════════════════════════
// PHONE OTP AUTHENTICATION (JWT-based)
// ═══════════════════════════════════════════════════════

// POST /api/auth/send-otp - Send OTP to phone
app.post("/api/auth/send-otp", async (req, res) => {
  // 1. Validate phone number
  // 2. Generate 6-digit OTP
  // 3. Store OTP in DB with expiry
  // 4. Send via Fast2SMS
  // 5. Return: { success: true }
});

// POST /api/auth/verify-otp - Verify OTP + return token
app.post("/api/auth/verify-otp", async (req, res) => {
  // 1. Validate OTP
  // 2. Find or create user
  // 3. Generate JWT token
  // 4. Return: { token, user }
});

// ═══════════════════════════════════════════════════════
// TOKEN VERIFICATION
// ═══════════════════════════════════════════════════════

// GET /api/auth/token-user - Verify token and return user
app.get("/api/auth/token-user", requireToken, async (req, res) => {
  // 1. Token verified by middleware
  // 2. Get user from DB
  // 3. Return user data
});
```

### Step 3: Update Frontend (No UI Changes!)

```typescript
// client/src/pages/login.tsx

// Email Signup/Login
const emailAuth = useMutation({
  mutationFn: async (data) => {
    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/token-login';
    const res = await apiRequest('POST', endpoint, data);
    return res.json();
  },
  onSuccess: (data) => {
    // Save token
    if (data.token) {
      saveToken(data.token);
    }
    // Reload app
    window.location.reload();
  }
});

// Phone OTP Verification
const verifyOtp = useMutation({
  mutationFn: async (data) => {
    const res = await apiRequest('POST', '/api/auth/verify-otp', data);
    return res.json();
  },
  onSuccess: (data) => {
    // Save token
    if (data.token) {
      saveToken(data.token);
    }
    // Reload app
    window.location.reload();
  }
});

// Google OAuth - UNCHANGED
const handleGoogleLogin = () => {
  window.location.href = '/api/login'; // Uses session
};
```

### Step 4: Token Storage (Frontend)

```typescript
// client/src/lib/tokenStorage.ts

const TOKEN_KEY = 'auth_token';

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('[Auth] Token saved');
  } catch (error) {
    console.error('[Auth] Failed to save token:', error);
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// For production: Migrate to Capacitor Secure Storage
// import { SecureStorage } from '@capacitor-community/secure-storage';
```

### Step 5: API Client (Auto Token Injection)

```typescript
// client/src/lib/queryClient.ts

function getHeaders(includeContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  // Automatically add Authorization header
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(getApiUrl(url), {
    method,
    headers: getHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // Keep for session fallback (Google OAuth)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}
```

---

## Authentication Flow Diagrams

### Email/Password Flow:

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│  User   │                    │ Frontend│                    │  Backend │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ Enter email/password         │                              │
     ├──────────────────────────────>│                              │
     │                              │                              │
     │                              │ POST /api/auth/token-login   │
     │                              ├──────────────────────────────>│
     │                              │ { email, password }          │
     │                              │                              │
     │                              │                  Verify      │
     │                              │                  password    │
     │                              │                              │
     │                              │                  Generate    │
     │                              │                  JWT token   │
     │                              │                              │
     │                              │ { token, user }              │
     │                              │<──────────────────────────────┤
     │                              │                              │
     │           Save token         │                              │
     │          to localStorage     │                              │
     │                              │                              │
     │ Login successful             │                              │
     │<──────────────────────────────┤                              │
     │                              │                              │
     │ Navigate to dashboard        │                              │
     │                              │                              │
```

### Phone OTP Flow:

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│  User   │                    │ Frontend│                    │  Backend │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ Enter phone number           │                              │
     ├──────────────────────────────>│                              │
     │                              │                              │
     │                              │ POST /api/auth/send-otp      │
     │                              ├──────────────────────────────>│
     │                              │ { phone }                    │
     │                              │                              │
     │                              │                  Generate OTP│
     │                              │                  Send via SMS│
     │                              │                              │
     │                              │ { success: true }            │
     │                              │<──────────────────────────────┤
     │                              │                              │
     │ OTP sent                     │                              │
     │<──────────────────────────────┤                              │
     │                              │                              │
     │ Receive SMS: "123456"        │                              │
     │                              │                              │
     │ Enter OTP: 123456            │                              │
     ├──────────────────────────────>│                              │
     │                              │                              │
     │                              │ POST /api/auth/verify-otp    │
     │                              ├──────────────────────────────>│
     │                              │ { phone, otp }               │
     │                              │                              │
     │                              │                  Verify OTP  │
     │                              │                  Find/create │
     │                              │                  user        │
     │                              │                  Generate    │
     │                              │                  JWT token   │
     │                              │                              │
     │                              │ { token, user }              │
     │                              │<──────────────────────────────┤
     │                              │                              │
     │           Save token         │                              │
     │          to localStorage     │                              │
     │                              │                              │
     │ Login successful             │                              │
     │<──────────────────────────────┤                              │
     │                              │                              │
```

### API Call with Token:

```
┌─────────┐                    ┌─────────┐                    ┌──────────┐
│  User   │                    │ Frontend│                    │  Backend │
└────┬────┘                    └────┬────┘                    └────┬─────┘
     │                              │                              │
     │ Click "View Alarms"          │                              │
     ├──────────────────────────────>│                              │
     │                              │                              │
     │         Read token from      │                              │
     │         localStorage         │                              │
     │                              │                              │
     │                              │ GET /api/alarms              │
     │                              ├──────────────────────────────>│
     │                              │ Header:                      │
     │                              │ Authorization: Bearer <token>│
     │                              │                              │
     │                              │        Verify token          │
     │                              │        Extract userId        │
     │                              │        Query DB:             │
     │                              │        WHERE userId = ...    │
     │                              │                              │
     │                              │ [ { alarm1 }, { alarm2 } ]   │
     │                              │<──────────────────────────────┤
     │                              │                              │
     │ Display alarms               │                              │
     │<──────────────────────────────┤                              │
     │                              │                              │
```

---

## Security Considerations

### Token Security:
- ✅ Tokens signed with SESSION_SECRET
- ✅ Short expiry (15 mins for access, 7 days for refresh)
- ✅ Verified on every request
- ✅ Cannot be forged
- ✅ Stored securely (localStorage for dev, Secure Storage for prod)

### Password Security:
- ✅ Hashed with bcrypt (12 rounds)
- ✅ Never stored in plain text
- ✅ Never logged or returned in responses

### Multi-User Isolation:
- ✅ userId extracted from verified token
- ✅ Each user only sees their own data
- ✅ No cross-user data leakage

### API Security:
- ✅ HTTPS in production
- ✅ CORS configured properly
- ✅ Input validation on all endpoints
- ✅ Rate limiting (recommended: 5 attempts per 15 mins)

---

## Migration Strategy

### Phase 1: Prepare (No Breaking Changes)
1. Enhance tokenAuth.ts with new functions
2. Keep all existing endpoints working
3. Add new unified auth endpoints alongside old ones

### Phase 2: Update Backend
1. Remove duplicate endpoints from localAuth.ts
2. Consolidate all auth in routes.ts
3. Ensure isAuthenticatedAny() works with both session and token

### Phase 3: Update Frontend
1. Update login.tsx to use new endpoints
2. Ensure token is saved after all auth methods
3. Keep UI exactly the same

### Phase 4: Test
1. Test email signup → token works
2. Test email login → token works
3. Test phone OTP → token works
4. Test Google OAuth → still works (session-based)
5. Test API calls → no 401 errors
6. Test app restart → stays logged in

### Phase 5: Deploy
1. Set strong SESSION_SECRET
2. Build and deploy backend
3. Build and deploy mobile app
4. Monitor for issues

---

## Benefits of This Architecture

✅ **Single Source of Truth**: All auth logic in one place
✅ **Backwards Compatible**: Google OAuth still works
✅ **Mobile-Friendly**: JWT tokens work in WebView
✅ **Secure**: Industry-standard JWT implementation
✅ **Maintainable**: Clear separation of concerns
✅ **Scalable**: Easy to add new auth methods
✅ **No UI Changes**: Users see exactly the same interface

---

## Next Steps

1. ✅ Research completed
2. ✅ Architecture designed
3. ⏳ Implement enhanced tokenAuth.ts
4. ⏳ Consolidate routes.ts
5. ⏳ Update frontend
6. ⏳ Test thoroughly
7. ⏳ Deploy

---

**Status**: Architecture finalized, ready for implementation
**Estimated Time**: 2-3 hours for complete implementation and testing
**Risk Level**: Low (backwards compatible, no breaking changes)
