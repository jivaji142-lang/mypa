# JWT Authentication Implementation Guide

## Quick Summary

This guide shows you how to integrate the JWT token authentication system into your app to fix 401 errors and support multiple users properly.

---

## What's Already Done ✅

1. **Backend JWT System**:
   - `server/tokenAuth.ts` - Token generation, verification, middleware
   - `POST /api/auth/token-login` - Login endpoint that returns JWT
   - `GET /api/auth/token-user` - Verify token endpoint
   - All routes updated to support token auth

2. **Token Storage**:
   - `client/src/lib/tokenStorage.ts` - Save/get/remove tokens from localStorage

3. **API Client**:
   - `client/src/lib/queryClient.ts` - Automatically attaches Authorization header

4. **Auth Components** (NEW):
   - `client/src/contexts/AuthContext.tsx` - Global auth state
   - `client/src/components/ProtectedRoute.tsx` - Navigation guard

---

## Step-by-Step Integration

### Step 1: Wrap App with AuthProvider

**File**: `client/src/main.tsx`

**Current**:
```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

**Updated**:
```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext"; // ADD THIS

root.render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider> {/* ADD THIS */}
      <App />
    </AuthProvider> {/* ADD THIS */}
  </QueryClientProvider>
);
```

---

### Step 2: Update Login Page

**File**: `client/src/pages/login.tsx` (or wherever your login form is)

**Replace the existing login logic with**:

```tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(email, password);
      // Login successful - AuthContext handles token storage
      navigate('/dashboard');
    } catch (err) {
      // Error is already set in AuthContext
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl font-bold">Login</h1>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
}
```

**Key Points**:
- Use `useAuth()` hook to access `login()` function
- Call `login(email, password)` - it handles token storage automatically
- Navigate to dashboard on success
- Error handling is managed by AuthContext

---

### Step 3: Protect Dashboard Route

**File**: `client/src/App.tsx` (or wherever you define routes)

**Current**:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/dashboard';
import { LoginPage } from '@/pages/login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Updated**:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from '@/pages/dashboard';
import { LoginPage } from '@/pages/login';
import { ProtectedRoute } from '@/components/ProtectedRoute'; // ADD THIS

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Wrap protected routes with ProtectedRoute */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Protect all authenticated pages */}
        <Route path="/alarms" element={
          <ProtectedRoute>
            <AlarmsPage />
          </ProtectedRoute>
        } />

        {/* Default route */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**What ProtectedRoute does**:
1. Shows loading spinner while checking token
2. If token invalid → Redirects to /login
3. If token valid → Shows the page

---

### Step 4: Add Logout Button

**Any page** (e.g., Dashboard, Settings):

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Clears token from localStorage
    navigate('/login');
  };

  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <h1>Welcome, {user?.email}</h1>
        <Button onClick={handleLogout}>
          Logout
        </Button>
      </header>

      {/* Rest of dashboard content */}
    </div>
  );
}
```

---

### Step 5: Verify API Calls Include Token

**You don't need to change anything!** The token is automatically attached.

**How it works** (`client/src/lib/queryClient.ts`):

```typescript
// This function already exists and works automatically
function getHeaders(includeContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  // Automatically adds Authorization header if token exists
  const token = getToken(); // Reads from localStorage
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// Every API call uses this:
fetch(url, {
  headers: getHeaders(true), // Token automatically included
  body: JSON.stringify(data)
});
```

**All existing API calls will work automatically**:
- `useAlarms()` → Includes token
- `useMedicines()` → Includes token
- `useMeetings()` → Includes token
- Custom fetch calls using `apiRequest()` → Includes token

---

## Testing the Flow

### Test 1: New User Registration (if implemented)

```bash
# Create account
POST /api/auth/register
Body: { "email": "newuser@test.com", "password": "Pass123", "firstName": "New" }

# Returns: { token, user }
# App saves token to localStorage
# App sets user in AuthContext
# App navigates to dashboard
```

### Test 2: Login Flow

```bash
# User enters email + password in login form
↓
POST /api/auth/token-login
Body: { "email": "test121@gmail.com", "password": "Test@123" }
↓
Backend verifies password
Backend generates JWT token
Backend returns: { token, user }
↓
AuthContext.login() saves token to localStorage
AuthContext sets user state
↓
App navigates to /dashboard
ProtectedRoute verifies token
Dashboard loads
```

### Test 3: App Restart (Auto-Login)

```bash
# User closes app
# User opens app again
↓
AuthProvider mounts
Reads token from localStorage
↓
GET /api/auth/token-user
Headers: { Authorization: "Bearer <token>" }
↓
Backend verifies token
Backend returns user data
↓
AuthContext sets user state
App stays logged in
Dashboard loads without asking for login
```

### Test 4: API Call with Token

```bash
# User clicks "View Alarms" on Dashboard
↓
GET /api/alarms
Headers: { Authorization: "Bearer <token>" } ← Automatically added
↓
Backend extracts token from Authorization header
Backend verifies token signature
Backend decodes: userId = "abc-123"
Backend queries: SELECT * FROM alarms WHERE userId = "abc-123"
Backend returns alarms
↓
Dashboard displays alarms
```

### Test 5: Multi-User Data Isolation

```bash
# User 1 creates alarm
POST /api/alarms
Headers: { Authorization: "Bearer <user1-token>" }
Body: { time: "08:00", title: "Wake up" }
↓
Backend extracts userId from user1-token
Backend saves alarm with userId = user1-id
↓

# User 2 views alarms
GET /api/alarms
Headers: { Authorization: "Bearer <user2-token>" }
↓
Backend extracts userId from user2-token
Backend queries: SELECT * WHERE userId = user2-id
Backend returns: [] (empty - user2 has no alarms)
↓

# User 1 views alarms
GET /api/alarms
Headers: { Authorization: "Bearer <user1-token>" }
↓
Backend extracts userId from user1-token
Backend queries: SELECT * WHERE userId = user1-id
Backend returns: [{ time: "08:00", title: "Wake up" }]
```

---

## Troubleshooting

### Issue: Still getting 401 after login

**Check**:
1. Token saved to localStorage?
   ```js
   console.log(localStorage.getItem('auth_token'));
   ```

2. Token included in request headers?
   - Open DevTools → Network tab
   - Click on failed request
   - Check Request Headers for: `Authorization: Bearer ...`

3. Token valid?
   - Copy token from localStorage
   - Go to https://jwt.io
   - Paste token → Check expiry date

**Fix**:
- If no token in localStorage → Login flow not saving token
- If token not in headers → API client not attaching header
- If token expired → User needs to re-login

---

### Issue: App shows login screen on every restart

**Check**:
1. Token persists in localStorage?
   ```js
   // Should work across app restarts
   localStorage.getItem('auth_token');
   ```

2. AuthContext calling `verifyToken()` on mount?
   - Check console logs for `[Auth] Token valid`

**Fix**:
- Ensure `useEffect` in AuthProvider runs on mount
- Check that `verifyToken()` is called in `useEffect`

---

### Issue: Multiple users see same data

**Check**:
1. Backend using token to get userId?
   ```typescript
   // WRONG:
   const userId = req.body.userId; // User can fake this!

   // CORRECT:
   const userId = getUserId(req); // From verified token
   ```

2. Database queries filtering by userId?
   ```typescript
   // WRONG:
   SELECT * FROM alarms; // Returns ALL users' alarms!

   // CORRECT:
   SELECT * FROM alarms WHERE userId = ?;
   ```

**Fix**:
- Always use `getUserId(req)` in route handlers
- Never trust userId from request body
- Filter all queries by userId

---

## Build and Deploy

### Build Frontend
```bash
npm run build
```

### Sync Capacitor
```bash
npx cap sync android
```

### Build Android APK
```bash
cd android
./gradlew assembleDebug
```

### Rebuild Vercel API
```bash
npx tsx script/build-vercel-api.ts
git add -A
git commit -m "Implement production JWT authentication"
git push
```

---

## Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to strong random string (min 32 chars)
- [ ] Use environment variable for `JWT_SECRET`, never commit to git
- [ ] Enable HTTPS in production (required for secure tokens)
- [ ] Set short token expiry (7 days max)
- [ ] Implement rate limiting on login endpoint (max 5 attempts/15 min)
- [ ] Hash passwords with bcrypt (min 10 rounds)
- [ ] Validate input on all endpoints (email format, password strength)
- [ ] Add CORS restrictions in production
- [ ] Enable request logging for security audits
- [ ] Test multi-user scenarios thoroughly

---

## Migration from Session to Token Auth

If you have existing users with session-based auth:

### Option 1: Gradual Migration (Recommended)
```typescript
// Both session and token auth work simultaneously
// Existing users keep using sessions
// New users use tokens
// No breaking changes
```

### Option 2: Force Migration
```typescript
// Logout all session users
// Clear session store
// Force re-login with token auth
// Users must login again
```

**Current implementation**: Option 1 (both work)

---

## Next Steps

1. ✅ Integrate AuthProvider in main.tsx
2. ✅ Update login page to use useAuth hook
3. ✅ Wrap dashboard routes with ProtectedRoute
4. ✅ Add logout button
5. ✅ Test multi-user scenarios
6. ✅ Deploy to production

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify token in localStorage
4. Test with curl to isolate frontend/backend issues
5. Check Vercel logs for backend errors

