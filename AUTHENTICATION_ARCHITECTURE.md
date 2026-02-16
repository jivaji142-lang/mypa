# Production Authentication Architecture

## Overview

This document describes the complete JWT-based authentication system for multi-user mobile app.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Capacitor)                   │
├─────────────────────────────────────────────────────────────┤
│  1. User enters email/password                              │
│  2. POST /api/auth/token-login                              │
│     ↓                                                        │
│  3. Backend validates credentials                           │
│  4. Backend generates JWT token (userId + email)            │
│  5. Backend returns: { token, user }                        │
│     ↓                                                        │
│  6. App stores token in localStorage                        │
│  7. App saves user in AuthContext                           │
│  8. App navigates to Dashboard                              │
│     ↓                                                        │
│  9. All API calls include: Authorization: Bearer <token>    │
│ 10. Backend extracts userId from token                      │
│ 11. Backend returns ONLY that user's data                   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Backend (Express + JWT)

**Location**: `server/tokenAuth.ts`

**Responsibilities**:
- Generate JWT tokens on login
- Verify JWT tokens on each request
- Extract user ID from token
- Protect routes with `requireToken` middleware

**Key Functions**:
```typescript
generateToken(userId, email) → JWT string (expires in 7 days)
verifyToken(token) → { userId, email } | null
requireToken → Express middleware
handleTokenLogin → POST /api/auth/token-login
handleGetTokenUser → GET /api/auth/token-user
```

---

### 2. Frontend (React + Capacitor)

#### 2.1 Token Storage

**Location**: `client/src/lib/tokenStorage.ts`

**Responsibilities**:
- Save/retrieve/remove token from localStorage
- Check if user is authenticated
- Works in Capacitor WebView (persists across app restarts)

**Functions**:
```typescript
saveToken(token: string) → void
getToken() → string | null
removeToken() → void
isAuthenticated() → boolean
```

---

#### 2.2 API Client with Token Injection

**Location**: `client/src/lib/queryClient.ts`

**Responsibilities**:
- Automatically attach Authorization header to ALL requests
- Handle 401 errors globally
- Support both token and session auth (backwards compat)

**How it works**:
```typescript
function getHeaders() {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// Every fetch call uses getHeaders()
fetch(url, {
  headers: getHeaders(),
  credentials: 'include' // Keep for session fallback
});
```

---

#### 2.3 Auth Context (React State Management)

**Location**: `client/src/contexts/AuthContext.tsx` (NEW FILE)

**Responsibilities**:
- Manage global auth state
- Provide login/logout functions
- Persist login across app restarts
- Validate token on app startup

**State**:
```typescript
{
  user: User | null,
  isLoading: boolean,
  isAuthenticated: boolean,
  login(email, password) → Promise<void>,
  logout() → void
}
```

**Lifecycle**:
1. App starts → AuthProvider calls GET /api/auth/token-user
2. If token valid → Sets user state, app stays logged in
3. If token invalid → Removes token, shows login screen
4. User logs in → Calls POST /api/auth/token-login → Saves token → Sets user
5. User makes API calls → Token automatically included
6. User logs out → Removes token → Clears user → Redirects to login

---

#### 2.4 Protected Routes (Navigation Guards)

**Location**: `client/src/components/ProtectedRoute.tsx` (NEW FILE)

**Responsibilities**:
- Prevent unauthenticated access to dashboard
- Show loading state during auth check
- Redirect to login if not authenticated

**Usage**:
```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## Authentication Flow

### Registration (Sign Up)

```
User fills form (email, password, name)
  ↓
POST /api/auth/register
  ↓
Backend hashes password with bcrypt
  ↓
Backend saves user to database
  ↓
Backend generates JWT token
  ↓
Backend returns { token, user }
  ↓
App saves token to localStorage
  ↓
App sets user in AuthContext
  ↓
App navigates to Dashboard
```

---

### Login

```
User enters email + password
  ↓
POST /api/auth/token-login
  ↓
Backend finds user by email
  ↓
Backend verifies password (bcrypt.compare)
  ↓
Backend generates JWT token (userId + email)
  ↓
Backend returns { token, user }
  ↓
App saves token to localStorage
  ↓
App sets user in AuthContext
  ↓
App navigates to Dashboard
```

---

### App Startup (Auto-Login)

```
App launches
  ↓
AuthProvider mounts
  ↓
Reads token from localStorage
  ↓
If no token → Show login screen
  ↓
If token exists → GET /api/auth/token-user
  ↓
Backend verifies token signature
  ↓
If valid → Returns user data → App stays logged in
  ↓
If invalid → Returns 401 → Remove token → Show login
```

---

### API Requests (Protected Endpoints)

```
User clicks "View Alarms"
  ↓
GET /api/alarms
  ↓
API client reads token from localStorage
  ↓
API client adds: Authorization: Bearer <token>
  ↓
Backend extracts token from header
  ↓
Backend verifies token signature
  ↓
Backend extracts userId from token
  ↓
Backend queries: SELECT * FROM alarms WHERE userId = <userId>
  ↓
Backend returns ONLY that user's alarms
  ↓
App displays alarms
```

---

### Logout

```
User clicks "Logout"
  ↓
AuthContext.logout() called
  ↓
Remove token from localStorage
  ↓
Clear user from AuthContext state
  ↓
Navigate to /login
  ↓
User sees login screen
```

---

## Multi-User Data Isolation

### Backend Implementation

**CRITICAL**: Never trust userId from request body!

❌ **WRONG** (Security Vulnerability):
```typescript
app.get('/api/alarms', (req, res) => {
  const userId = req.body.userId; // USER CAN FAKE THIS!
  const alarms = await getAlarms(userId);
  res.json(alarms);
});
```

✅ **CORRECT** (Secure):
```typescript
app.get('/api/alarms', requireToken, (req, res) => {
  const userId = req.user.id; // FROM VERIFIED TOKEN
  const alarms = await getAlarms(userId);
  res.json(alarms);
});
```

**How it works**:
1. `requireToken` middleware extracts token from Authorization header
2. Middleware verifies token signature with secret key
3. Middleware decodes token → extracts userId
4. Middleware attaches `req.user = { id: userId }` to request
5. Route handler uses `req.user.id` (trusted, verified)

---

## Security Best Practices

### 1. Token Security
```typescript
// Strong secret (min 32 characters)
const JWT_SECRET = process.env.SESSION_SECRET;

// Short expiry (force re-login if compromised)
const TOKEN_EXPIRY = '7d'; // 7 days

// Verify on EVERY request
jwt.verify(token, JWT_SECRET);
```

### 2. Password Security
```typescript
// Hash with bcrypt (min 10 rounds)
const hash = await bcrypt.hash(password, 10);

// Never store plain passwords
// Never log passwords
// Never send passwords in responses
```

### 3. HTTPS Only (Production)
```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}
```

### 4. Rate Limiting (Prevent Brute Force)
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/auth/token-login', loginLimiter, handleTokenLogin);
```

---

## Token Refresh Strategy

### Option 1: Long-Lived Tokens (Current Implementation)
- Token expires in 7 days
- User must re-login after 7 days
- Simple, secure, mobile-friendly

### Option 2: Refresh Tokens (More Complex)
```typescript
// Login returns TWO tokens:
{
  accessToken: 'short-lived (15 min)',
  refreshToken: 'long-lived (7 days)'
}

// On 401:
POST /api/auth/refresh
Body: { refreshToken }
  ↓
Backend generates new accessToken
  ↓
App stores new accessToken
  ↓
App retries failed request
```

**Current implementation uses Option 1** (simpler, sufficient for most apps)

---

## Testing Multi-User Isolation

### Test Case 1: Create Two Users
```bash
# User 1
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user1@test.com","password":"Pass123"}'

# User 2
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user2@test.com","password":"Pass123"}'
```

### Test Case 2: Create Alarm as User 1
```bash
# Login as User 1
TOKEN1=$(curl -s -X POST http://localhost:5000/api/auth/token-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user1@test.com","password":"Pass123"}' \
  | jq -r '.token')

# Create alarm as User 1
curl -X POST http://localhost:5000/api/alarms \
  -H "Authorization: Bearer $TOKEN1" \
  -H 'Content-Type: application/json' \
  -d '{"time":"08:00","title":"Morning Alarm"}'
```

### Test Case 3: Verify User 2 Cannot See User 1's Alarm
```bash
# Login as User 2
TOKEN2=$(curl -s -X POST http://localhost:5000/api/auth/token-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user2@test.com","password":"Pass123"}' \
  | jq -r '.token')

# Get alarms as User 2 (should be empty)
curl -s http://localhost:5000/api/alarms \
  -H "Authorization: Bearer $TOKEN2"

# Expected: []
# NOT: [{"time":"08:00","title":"Morning Alarm"}]
```

---

## Migration Plan

### Step 1: Enable Token Auth (Keep Session as Fallback)
- ✅ Token auth endpoints exist (`/api/auth/token-login`)
- ✅ `requireToken` middleware exists
- ✅ Routes updated to support both session AND token
- ⏳ Need to add AuthContext on frontend
- ⏳ Need to update login form to save token
- ⏳ Need to add ProtectedRoute component

### Step 2: Update Frontend to Use Tokens
- Create `AuthContext.tsx`
- Update login page to call `/api/auth/token-login`
- Save token to localStorage
- Add Authorization header to all requests
- Implement auto-login on app startup

### Step 3: Test Multi-User Scenarios
- Create multiple test accounts
- Verify data isolation
- Test token expiry
- Test logout/login flow

### Step 4: Remove Session Fallback (Production)
- Remove `credentials: 'include'` from fetch calls
- Remove session middleware (optional)
- Use token auth exclusively

---

## Troubleshooting

### Issue: Still getting 401 after login
**Cause**: Token not being sent in requests
**Fix**: Check that `getHeaders()` is called in ALL fetch calls

### Issue: Token exists but still 401
**Cause**: Token expired or invalid
**Fix**: Check token expiry, verify JWT_SECRET matches

### Issue: User logged out on app restart
**Cause**: Token not saved to localStorage
**Fix**: Ensure `saveToken()` is called after login

### Issue: Multiple users see same data
**Cause**: Backend using wrong userId
**Fix**: Always use `req.user.id` from token, never `req.body.userId`

---

## File Structure

```
server/
  tokenAuth.ts              # JWT token generation & verification
  routes.ts                 # API routes (updated to support tokens)

client/src/
  lib/
    tokenStorage.ts         # Token save/get/remove (localStorage)
    queryClient.ts          # API client with Authorization header
    config.ts               # API URL configuration

  contexts/
    AuthContext.tsx         # NEW: Global auth state management

  components/
    ProtectedRoute.tsx      # NEW: Navigation guard

  pages/
    login.tsx               # Updated to use token auth
    register.tsx            # NEW: User registration
    dashboard.tsx           # Protected route
```

---

## Next Steps

1. ✅ Backend token auth implemented
2. ⏳ Create AuthContext
3. ⏳ Update login page
4. ⏳ Add ProtectedRoute
5. ⏳ Test multi-user isolation
6. ⏳ Deploy to production

