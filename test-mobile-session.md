# Mobile App Session Test Cases

## Overview
Testing cross-origin session cookie flow between mobile app and production API.

**Mobile App Origin**: `http://10.195.157.10:8080` (Capacitor Android WebView)
**API Origin**: `https://mypa-liard.vercel.app`

---

## Test Case 1: Login Flow

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/auth/login' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://10.195.157.10:8080' \
  -H 'Referer: http://10.195.157.10:8080/' \
  --data-raw '{"email":"test121@gmail.com","password":"Test@123"}' \
  --include
```

### Expected Response
- **Status**: `200 OK`
- **Headers**:
  ```
  Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; Secure; SameSite=None
  Access-Control-Allow-Origin: http://10.195.157.10:8080
  Access-Control-Allow-Credentials: true
  ```
- **Body**:
  ```json
  {
    "message": "Logged in",
    "user": {
      "id": "...",
      "email": "test121@gmail.com"
    }
  }
  ```

### Verification
✅ Set-Cookie header present
✅ SameSite=None for cross-origin
✅ Secure flag set (HTTPS only)
✅ HttpOnly flag set (XSS protection)
✅ No Domain restriction (allows cross-origin)

---

## Test Case 2: Get Current User (Authenticated)

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/auth/user' \
  -H 'Accept: */*' \
  -H 'Origin: http://10.195.157.10:8080' \
  -H 'Referer: http://10.195.157.10:8080/' \
  -H 'Cookie: connect.sid=<COOKIE_FROM_LOGIN>' \
  --include
```

### Expected Response
- **Status**: `200 OK`
- **Body**:
  ```json
  {
    "id": "...",
    "email": "test121@gmail.com",
    "firstName": "Test",
    "lastName": "User"
  }
  ```

### Verification
✅ Request includes Cookie header
✅ Server accepts cookie from cross-origin
✅ Returns user data (not 401)
✅ Session persists across requests

---

## Test Case 3: Get Current User (Unauthenticated)

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/auth/user' \
  -H 'Origin: http://10.195.157.10:8080' \
  --include
```

### Expected Response
- **Status**: `401 Unauthorized`
- **Body**:
  ```json
  {
    "message": "Unauthorized"
  }
  ```

### Verification
✅ Returns 401 when no cookie sent
✅ Does not crash or return 500

---

## Test Case 4: Fetch Alarms (Authenticated)

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/alarms' \
  -H 'Origin: http://10.195.157.10:8080' \
  -H 'Cookie: connect.sid=<COOKIE_FROM_LOGIN>' \
  --include
```

### Expected Response
- **Status**: `200 OK`
- **Body**:
  ```json
  [
    {
      "id": 1,
      "userId": "...",
      "time": "08:00:00",
      "enabled": true,
      "title": "Morning Alarm",
      "days": [1, 2, 3, 4, 5]
    }
  ]
  ```

### Verification
✅ Cookie authentication works for all protected endpoints
✅ User can only see their own alarms

---

## Test Case 5: Session Persistence (Rolling Cookie)

### Request Sequence
1. Login → Get cookie with maxAge=7d
2. Wait 1 hour
3. Call `/api/auth/user` → Should refresh cookie maxAge to 7d again
4. Check Set-Cookie header in response

### Expected Behavior
- **Each request resets the cookie expiration** (rolling session)
- Session stays alive as long as user is active
- Session expires after 7 days of inactivity

### Verification
✅ `rolling: true` in session config
✅ Cookie maxAge refreshed on each request
✅ No unexpected 401 errors during active use

---

## Test Case 6: CORS Preflight (OPTIONS)

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/auth/login' \
  -X OPTIONS \
  -H 'Origin: http://10.195.157.10:8080' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  --include
```

### Expected Response
- **Status**: `204 No Content`
- **Headers**:
  ```
  Access-Control-Allow-Origin: http://10.195.157.10:8080
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cookie
  Access-Control-Max-Age: 86400
  ```

### Verification
✅ Preflight succeeds (not blocked)
✅ Cookie header allowed
✅ Credentials allowed
✅ 24-hour cache (86400s)

---

## Test Case 7: Logout

### Request
```bash
curl 'https://mypa-liard.vercel.app/api/auth/logout' \
  -X POST \
  -H 'Origin: http://10.195.157.10:8080' \
  -H 'Cookie: connect.sid=<COOKIE_FROM_LOGIN>' \
  --include
```

### Expected Response
- **Status**: `200 OK`
- **Headers**:
  ```
  Set-Cookie: connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
  ```

### Verification
✅ Cookie is cleared (expired)
✅ Subsequent requests return 401
✅ User is properly logged out

---

## Mobile App Testing Steps

### 1. Enable Network Debugging
In Chrome DevTools connected to Android device:
```bash
chrome://inspect/#devices
```

### 2. Check Cookie Storage
In DevTools Console:
```javascript
document.cookie
```
Expected: `"connect.sid=s%3A..."`

### 3. Verify Fetch Credentials
In queryClient.ts, ensure all fetch calls have:
```typescript
fetch(url, {
  credentials: 'include'  // ✅ CRITICAL for cross-origin cookies
})
```

### 4. Check Network Tab
- Login request → Look for `Set-Cookie` in Response Headers
- User request → Look for `Cookie` in Request Headers
- If Cookie missing in Request → Cookie not being stored/sent

### 5. Check Capacitor WebView Cookies
Android WebView should store cookies by default, but verify:
```java
// In MainActivity.java or similar
CookieManager cookieManager = CookieManager.getInstance();
cookieManager.setAcceptCookie(true);
cookieManager.setAcceptThirdPartyCookies(webView, true);
```

---

## Common Issues & Solutions

### Issue 1: 401 After Login
**Symptom**: Login succeeds (200 OK) but `/api/auth/user` returns 401

**Root Cause**: Cookie not being sent in subsequent requests

**Solutions**:
1. ✅ Check `credentials: 'include'` in all fetch calls
2. ✅ Check `Set-Cookie` header in login response
3. ✅ Check `Cookie` header in user request
4. ✅ Verify no domain restriction on cookie
5. ✅ Verify `sameSite: 'none'` for cross-origin
6. ✅ Enable third-party cookies in WebView

### Issue 2: CORS Error
**Symptom**: Network tab shows "CORS policy blocked"

**Solutions**:
1. ✅ Verify CORS middleware installed
2. ✅ Check `Access-Control-Allow-Credentials: true`
3. ✅ Check `Access-Control-Allow-Origin` matches request origin
4. ✅ Check Cookie header is in allowedHeaders

### Issue 3: Cookie Not Stored
**Symptom**: Set-Cookie works but cookie not in DevTools

**Solutions**:
1. ✅ Check `Secure` flag - requires HTTPS
2. ✅ Check `SameSite=None` with `Secure=true`
3. ✅ Enable third-party cookies in browser/WebView
4. ✅ Check no Privacy/Tracking protection blocking

### Issue 4: Session Expires Too Fast
**Symptom**: User gets logged out unexpectedly

**Solutions**:
1. ✅ Check `maxAge: 7d` in cookie config
2. ✅ Verify `rolling: true` (refresh on each request)
3. ✅ Check PostgreSQL session store TTL
4. ✅ Verify session not being destroyed server-side

---

## Configuration Summary

### Server (server/replit_integrations/auth/replitAuth.ts)
```typescript
cookie: {
  httpOnly: true,           // ✅ XSS protection
  secure: isProduction,     // ✅ HTTPS only in prod
  sameSite: 'none',         // ✅ Allow cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000,  // ✅ 7 days
  path: '/',                // ✅ All routes
  domain: undefined,        // ✅ NO restriction (cross-origin support)
}
```

### Client (client/src/lib/queryClient.ts)
```typescript
fetch(getApiUrl(url), {
  credentials: 'include',   // ✅ CRITICAL for cookies
})
```

### CORS (server/vercel-api.ts)
```typescript
cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,        // ✅ Allow cookies
  allowedHeaders: ['Content-Type', 'Cookie', 'Set-Cookie'],
})
```

---

## Success Criteria

✅ Login returns 200 OK with Set-Cookie header
✅ Cookie has `SameSite=None; Secure` attributes
✅ Cookie has NO domain restriction
✅ `/api/auth/user` returns 200 OK (not 401)
✅ Cookie is sent in subsequent requests
✅ All protected endpoints work
✅ Session persists for 7 days
✅ Rolling session keeps user logged in
✅ No CORS errors in mobile app

---

## Test Execution Checklist

- [ ] Test Case 1: Login Flow
- [ ] Test Case 2: Get User (Authenticated)
- [ ] Test Case 3: Get User (Unauthenticated)
- [ ] Test Case 4: Fetch Alarms
- [ ] Test Case 5: Session Persistence
- [ ] Test Case 6: CORS Preflight
- [ ] Test Case 7: Logout
- [ ] Mobile App Network Tab Verification
- [ ] Cookie Storage Verification
- [ ] End-to-End User Journey

---

## Debugging Tips

### 1. Enable Verbose Logging
Add to server code:
```typescript
app.use((req, res, next) => {
  console.log('[DEBUG] Request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    cookie: req.headers.cookie,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
  });
  next();
});
```

### 2. Check Vercel Logs
```bash
vercel logs --follow
```

### 3. Check Android Logcat
```bash
adb logcat | grep -i "cookie\|session\|auth"
```

### 4. Use curl with -v for Verbose
```bash
curl -v 'https://mypa-liard.vercel.app/api/auth/login' ...
```

---

**Last Updated**: 2026-02-15
**Status**: Cookie domain restriction removed for cross-origin support
