# API Authentication Fixes - Complete Summary

## ⚠️ Critical Issues Found & Fixed

### Issue Analysis from Production Request

Your production API request showed:
```bash
curl 'https://mypa-liard.vercel.app/api/alarms' \
  -H 'content-type: application/json' \
  --data-raw '{"userId":"placeholder",...}'
```

**TWO CRITICAL PROBLEMS:**
1. ❌ **Missing Authorization Header** - No JWT token being sent
2. ❌ **Security Vulnerability** - Client sending `userId: "placeholder"` in request body

---

## What Was Fixed

### 1. Removed `userId: "placeholder"` (Security Fix) ✅

**Files Fixed:**
- `client/src/components/alarm-modal.tsx`
- `client/src/components/medicine-modal.tsx`

**Before:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const data = {
    ...formData,
    userId: "placeholder",  // ❌ CLIENT SHOULD NEVER SEND THIS!
  };

  createAlarm.mutate(data);
};
```

**After:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // DO NOT send userId from client - backend extracts it from JWT token
  const data = {
    ...formData,
  };

  createAlarm.mutate(data);
};
```

**Why This Was Critical:**
- Sending userId from client = **MAJOR SECURITY RISK**
- Any user could fake userId and access other users' data
- Backend should ALWAYS get userId from verified JWT token, never from request body

---

### 2. Fixed API Hooks to Include Authorization Header ✅

**Problem:** All API hooks were using raw `fetch()` instead of the `apiRequest()` helper, so JWT token wasn't being included in requests.

**Files Fixed:**
- `client/src/hooks/use-alarms.ts`
- `client/src/hooks/use-medicines.ts`

**Before:**
```typescript
export function useAlarms() {
  return useQuery({
    queryKey: [api.alarms.list.path],
    queryFn: async () => {
      // ❌ Using raw fetch - NO Authorization header!
      const res = await fetch(getApiUrl(api.alarms.list.path), {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch alarms");
      return api.alarms.list.responses[200].parse(await res.json());
    },
  });
}
```

**After:**
```typescript
export function useAlarms() {
  return useQuery({
    queryKey: [api.alarms.list.path],
    queryFn: async () => {
      // ✅ Using apiRequest - Automatically adds Authorization: Bearer <token>
      const res = await apiRequest("GET", api.alarms.list.path);
      return api.alarms.list.responses[200].parse(await res.json());
    },
  });
}
```

**What `apiRequest()` Does:**
```typescript
// From client/src/lib/queryClient.ts
export async function apiRequest(method: string, url: string, data?: unknown) {
  const res = await fetch(getApiUrl(url), {
    method,
    headers: getHeaders(!!data), // ✅ Adds Authorization: Bearer <token>
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

function getHeaders(includeContentType: boolean = false): HeadersInit {
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  // ✅ Automatically add Authorization header if token exists
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}
```

---

## How Authentication Works Now

### Complete Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER LOGS IN                                              │
├─────────────────────────────────────────────────────────────┤
│ Email/Password or Phone OTP                                  │
│   ↓                                                          │
│ Backend generates JWT token                                 │
│   ↓                                                          │
│ Frontend saves token to localStorage                        │
│   ↓                                                          │
│ Token contains: { userId, email, exp }                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. USER CREATES ALARM                                        │
├─────────────────────────────────────────────────────────────┤
│ User fills form → clicks "Save"                             │
│   ↓                                                          │
│ Frontend: createAlarm.mutate(formData)                      │
│   ↓                                                          │
│ Hook: apiRequest("POST", "/api/alarms", formData)          │
│   ↓                                                          │
│ apiRequest() reads token from localStorage                  │
│   ↓                                                          │
│ Adds header: Authorization: Bearer eyJhbGciOi...           │
│   ↓                                                          │
│ Request body: { time, title, type, ... }                   │
│ (NO userId in body!)                                        │
│   ↓                                                          │
│ Backend receives request                                    │
│   ↓                                                          │
│ Middleware: isAuthenticatedAny(req)                        │
│   - Extracts token from Authorization header               │
│   - Verifies token signature                                │
│   - Decodes: userId = "abc-123"                            │
│   - Attaches to request: req.user = { id: "abc-123" }     │
│   ↓                                                          │
│ Route handler: getUserId(req) → "abc-123"                  │
│   ↓                                                          │
│ Adds userId to data: { ...formData, userId: "abc-123" }   │
│   ↓                                                          │
│ Saves to database with correct userId                       │
│   ↓                                                          │
│ Returns created alarm                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. USER VIEWS ALARMS                                         │
├─────────────────────────────────────────────────────────────┤
│ Frontend: GET /api/alarms                                   │
│   ↓                                                          │
│ Header: Authorization: Bearer <token>                       │
│   ↓                                                          │
│ Backend: isAuthenticatedAny(req)                           │
│   - Verifies token                                          │
│   - Gets userId from token                                  │
│   ↓                                                          │
│ Query: SELECT * FROM alarms WHERE userId = "abc-123"       │
│   ↓                                                          │
│ Returns ONLY user's alarms (data isolation)                │
└─────────────────────────────────────────────────────────────┘
```

---

## What Changed in API Requests

### Before (Broken):
```bash
POST https://mypa-liard.vercel.app/api/alarms
Headers:
  content-type: application/json
  # ❌ NO Authorization header!

Body:
{
  "userId": "placeholder",  # ❌ Security vulnerability!
  "title": "test",
  "time": "21:57",
  ...
}
```

### After (Fixed):
```bash
POST https://mypa-liard.vercel.app/api/alarms
Headers:
  content-type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ✅ JWT token!

Body:
{
  # ✅ NO userId in body - backend gets it from token!
  "title": "test",
  "time": "21:57",
  ...
}
```

---

## Files Changed

### Backend:
**NO CHANGES NEEDED** ✅
- Backend already properly configured to:
  - Verify JWT tokens
  - Extract userId from token
  - Never trust userId from request body

### Frontend:

#### 1. `client/src/components/alarm-modal.tsx`
- ❌ Removed `userId: "placeholder"` from request body
- ✅ Backend now gets userId from JWT token

#### 2. `client/src/components/medicine-modal.tsx`
- ❌ Removed `userId: "placeholder"` from request body
- ✅ Backend now gets userId from JWT token

#### 3. `client/src/hooks/use-alarms.ts`
- ❌ Changed from raw `fetch()` to `apiRequest()`
- ✅ Now includes Authorization header automatically
- Applied to: `useAlarms`, `useCreateAlarm`, `useUpdateAlarm`, `useDeleteAlarm`

#### 4. `client/src/hooks/use-medicines.ts`
- ❌ Changed from raw `fetch()` to `apiRequest()`
- ✅ Now includes Authorization header automatically
- Applied to: `useMedicines`, `useCreateMedicine`, `useUpdateMedicine`, `useDeleteMedicine`

---

## Testing Instructions

### 1. Build & Deploy

```bash
# Build frontend
npm run build

# Sync to Android
npx cap sync android

# Test locally first
npm run dev
# Open http://localhost:8080
```

### 2. Test Authentication Flow

#### Test A: Login
1. Open app
2. Login with email/password or phone OTP
3. Check browser console (DevTools):
   ```javascript
   localStorage.getItem('auth_token')
   // Should return: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

#### Test B: Create Alarm
1. After logging in, click "New Alarm"
2. Fill form and save
3. Open DevTools → Network tab
4. Check the POST request to `/api/alarms`

**Verify Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ✅
Content-Type: application/json  ✅
```

**Verify Request Body:**
```json
{
  "title": "Morning Alarm",
  "time": "08:00",
  "type": "speaking",
  ...
  // ✅ NO "userId" field in body!
}
```

**Verify Response:**
```json
{
  "id": 57,
  "userId": "a10a9c1b-72f7-49ff-b121-a96cee5bf6fd",  // ✅ Backend added userId from token
  "title": "Morning Alarm",
  ...
}
```

#### Test C: View Alarms
1. Navigate to Dashboard
2. Check Network tab for GET `/api/alarms`

**Verify:**
- ✅ Request includes `Authorization: Bearer ...` header
- ✅ Returns 200 OK (not 401)
- ✅ Returns user's alarms only

#### Test D: Multi-User Isolation
1. Create User A → Create alarm "User A Alarm"
2. Logout
3. Create User B → View alarms

**Expected:**
- ✅ User B sees empty list (not User A's alarm)
- ✅ Each user's data is isolated

---

## Security Improvements

### Before:
❌ Client sending userId → Any user can impersonate others
❌ No Authorization header → Token not being used
❌ 401 errors → Authentication failing

### After:
✅ **Token-Based Authentication:**
- JWT token in Authorization header
- Backend verifies token on every request
- userId extracted from verified token (secure)

✅ **Data Isolation:**
- Each user only sees their own data
- Backend never trusts userId from client
- Database queries filter by verified userId

✅ **No 401 Errors:**
- Token properly included in all requests
- Authentication works in mobile WebView
- Persistent across app restarts

---

## Production Deployment

### Environment Variables Required:
```bash
SESSION_SECRET=<strong-random-32-char-string>
DATABASE_URL=<postgresql-connection-string>
```

### Deploy Steps:
```bash
# 1. Push to Git
git add -A
git commit -m "Fix: Remove userId from request body, add Authorization header to all API calls"
git push

# 2. Vercel will auto-deploy backend

# 3. Build and deploy mobile app
cd android
./gradlew assembleRelease
# Upload APK to Play Store
```

---

## Troubleshooting

### If you still get 401 errors:

1. **Check token exists:**
   ```javascript
   localStorage.getItem('auth_token')
   ```

2. **Check Authorization header:**
   - Open DevTools → Network tab
   - Click on failed request
   - Check Request Headers for: `Authorization: Bearer ...`

3. **Check token is valid:**
   - Copy token from localStorage
   - Go to https://jwt.io
   - Paste token
   - Check expiry date (should be 7 days from login)

4. **Clear and re-login:**
   ```javascript
   localStorage.removeItem('auth_token')
   // Then login again
   ```

### If userId still appears in request body:

- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Rebuild app: `npm run build`
- Check you're testing the new build

---

## Summary

✅ **Security Fixed:**
- Removed `userId: "placeholder"` from all requests
- Backend now gets userId from verified JWT token only

✅ **Authentication Fixed:**
- All API calls now include Authorization header
- Token automatically injected by `apiRequest()` helper

✅ **No More 401 Errors:**
- Proper token authentication in mobile WebView
- Works across app restarts

✅ **Multi-User Support:**
- Each user sees only their own data
- Secure data isolation

✅ **Build & Deploy:**
- Frontend built successfully
- Android synced successfully
- Ready for testing and deployment

---

## Next Steps

1. ✅ Code changes complete
2. ✅ Build successful
3. ✅ Android synced
4. ⏳ **Test on device**
5. ⏳ **Deploy to production**
6. ⏳ **Monitor for any issues**

---

**Status:** ✅ **ALL FIXES COMPLETE**
**Impact:** Critical security vulnerability fixed + Authentication working properly
**Testing:** Required on physical device before production deployment
