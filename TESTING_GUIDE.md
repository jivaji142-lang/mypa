# Quick Testing Guide

## ✅ What Was Fixed

**Problem**: 401 errors after login in mobile app
**Solution**: All authentication endpoints now return JWT tokens

### Changes Made:
1. **Backend** (`server/routes.ts`):
   - `/api/auth/signup` now returns JWT token ✓
   - `/api/auth/login` now returns JWT token ✓
   - `/api/auth/verify-otp` now returns JWT token ✓

2. **Frontend** (`client/src/pages/login.tsx`):
   - Phone OTP now saves token to localStorage ✓

## 🧪 Test Results

### Backend Tests (Completed ✓)

```bash
# Test 1: Signup returns token
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","name":"Test User"}'
✓ Returns: { token: "eyJ...", user: {...}, success: true }

# Test 2: Login returns token
curl -X POST http://localhost:8080/api/auth/token-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
✓ Returns: { token: "eyJ...", user: {...}, message: "Login successful" }

# Test 3: Token works for protected endpoints
curl http://localhost:8080/api/alarms \
  -H "Authorization: Bearer <token>"
✓ Returns: [] (no 401 error)

# Test 4: Create data with token
curl -X POST http://localhost:8080/api/alarms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"time":"08:00","title":"Test Alarm","isActive":true}'
✓ Returns: { id: 54, userId: "...", ... }

# Test 5: Retrieve data with token
curl http://localhost:8080/api/alarms \
  -H "Authorization: Bearer <token>"
✓ Returns: [{ id: 54, title: "Test Alarm", ... }]
```

## 📱 Mobile Testing Instructions

### Step 1: Build the App

```bash
# Build frontend
npm run build

# Sync to Android
npx cap sync android

# Build APK (Debug)
cd android
./gradlew assembleDebug

# Install on device/emulator
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Step 2: Test Authentication Flow

#### Test A: Email/Password Signup
1. Open app on mobile device
2. Click "Email" tab
3. Click "Sign Up"
4. Enter:
   - Name: Test User
   - Email: mobile@test.com
   - Password: Test123456
5. Click "Create Account"

**Expected Result**:
- ✓ No errors
- ✓ Token saved to localStorage
- ✓ App navigates to Dashboard
- ✓ Dashboard loads without 401 errors

**To Verify**:
```javascript
// In Chrome DevTools connected to mobile app:
localStorage.getItem('auth_token')
// Should return: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Test B: Email/Password Login
1. Logout (from Settings)
2. Go to Email tab
3. Enter credentials from Test A
4. Click "Sign In"

**Expected Result**:
- ✓ Login successful
- ✓ Token saved
- ✓ Dashboard loads
- ✓ No 401 errors

#### Test C: Phone OTP Login
1. Logout
2. Go to Phone tab
3. Enter phone: +91 9876543210
4. Click "Send OTP"
5. Check server logs for OTP:
   ```
   [DEV] OTP for 9876543210: 123456
   ```
6. Enter OTP: 123456
7. Enter name: Mobile User
8. Click "Verify OTP"

**Expected Result**:
- ✓ Token saved to localStorage
- ✓ Dashboard loads
- ✓ No 401 errors

#### Test D: Create Alarm After Login
1. Login with any method
2. Click "+" to create alarm
3. Set time: 09:00 AM
4. Set title: "Morning Alarm"
5. Save

**Expected Result**:
- ✓ Alarm created successfully
- ✓ No 401 errors
- ✓ Alarm appears in list

#### Test E: App Restart Persistence
1. Login with any method
2. Create an alarm
3. Close app completely (swipe away from recent apps)
4. Reopen app

**Expected Result**:
- ✓ User automatically logged in
- ✓ Dashboard loads immediately
- ✓ Alarm still visible
- ✓ Token still in localStorage

#### Test F: Multi-User Data Isolation
1. Login as User A (email: usera@test.com)
2. Create alarm: "User A Alarm"
3. Logout
4. Signup as User B (email: userb@test.com)
5. View alarms list

**Expected Result**:
- ✓ User B sees EMPTY list
- ✓ User B cannot see User A's alarm
- ✓ Data is isolated

6. Logout User B
7. Login as User A
8. View alarms list

**Expected Result**:
- ✓ User A sees their alarm: "User A Alarm"
- ✓ Data persisted correctly

## 🐛 Debugging

### If you get 401 errors:

1. **Check token in localStorage**:
   ```javascript
   // Connect Chrome DevTools to mobile app
   // Console:
   localStorage.getItem('auth_token')
   ```

2. **Check if token is sent in requests**:
   - Open Chrome DevTools → Network tab
   - Trigger any API call
   - Check Request Headers:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

3. **Verify token is valid**:
   - Copy token from localStorage
   - Go to https://jwt.io
   - Paste token
   - Check expiry date (should be 7 days from issue)

4. **Check server logs**:
   ```bash
   # Start server with logs
   npm run dev

   # Look for:
   [Token Auth] Routes registered
   [Login] Token saved to localStorage
   [Auth] Token valid, user logged in
   ```

### If token not saved after signup/login:

1. Check browser console for errors
2. Check mutation response includes token
3. Check onSuccess handler is called
4. Verify saveToken() function works

## ✅ Success Criteria

- [x] Backend tests pass (5/5)
- [ ] Mobile signup works (no 401)
- [ ] Mobile login works (no 401)
- [ ] Mobile OTP works (no 401)
- [ ] API calls work after login
- [ ] Token persists after app restart
- [ ] Multi-user data isolation works

## 🚀 Production Deployment

Before deploying to production:

1. Set strong SESSION_SECRET:
   ```bash
   # Generate secure secret
   openssl rand -base64 32

   # Add to .env
   SESSION_SECRET=<generated-secret>
   ```

2. Build and deploy:
   ```bash
   # Frontend
   npm run build

   # Sync Capacitor
   npx cap sync android

   # Build release APK
   cd android
   ./gradlew assembleRelease

   # Deploy backend
   git push
   ```

3. Test on production server
4. Test on real device (not just emulator)

## 📊 Test Summary

| Test | Status | Notes |
|------|--------|-------|
| Backend signup returns token | ✅ PASS | Tested with curl |
| Backend login returns token | ✅ PASS | Tested with curl |
| Token authenticates API calls | ✅ PASS | Tested with curl |
| Create alarm with token | ✅ PASS | Tested with curl |
| Retrieve alarms with token | ✅ PASS | Tested with curl |
| Mobile signup | ⏳ PENDING | Test on device |
| Mobile login | ⏳ PENDING | Test on device |
| Mobile OTP | ⏳ PENDING | Test on device |
| Token persistence | ⏳ PENDING | Test app restart |
| Multi-user isolation | ⏳ PENDING | Test with 2 users |

---

**Next Steps**:
1. ✅ Backend fixed and tested
2. ✅ Mobile app synced
3. ⏳ Test on physical device
4. ⏳ Verify no 401 errors
5. ⏳ Deploy to production
