# Royal-Speaking-Alarm - Project Prompt

## Project Overview

**Royal-Speaking-Alarm** (also known as MyPA) is a comprehensive alarm and reminder application that provides speaking alarms, medicine reminders, and meeting notifications. The application is built as a full-stack web application with native mobile support for Android.

## Core Functionality

### 1. Speaking Alarms
- Create custom alarms with text-to-speech or recorded voice
- Support for recurring alarms (daily, weekly, specific days)
- Custom voice recording capability
- Multiple language support
- Background alarms that work even when screen is off (Android native)

### 2. Medicine Reminders
- Track medications with photos
- Custom voice reminders for each medicine
- Multiple daily reminders
- Dosage tracking

### 3. Meeting Notifications
- Schedule meetings with date/time
- Location and participant tracking
- Custom voice reminders

### 4. User Management
- Email/Password authentication
- Phone/OTP authentication
- Google OAuth support
- Trial period management
- Subscription handling (Stripe/Razorpay)

### 5. Push Notifications
- Native push notifications for Android/iOS
- Background notification support
- VAPID key-based web push

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS with custom animations
- **Build Tool**: Vite
- **Mobile**: Capacitor for native Android features

### Backend Stack
- **Runtime**: Node.js with Express.js v5
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with Express Sessions
- **File Upload**: Multer
- **Push Notifications**: Web Push API
- **Payments**: Stripe and Razorpay integration

### Mobile Stack
- **Framework**: Capacitor 8
- **Platform**: Android (with iOS support possible)
- **Plugins**:
  - Local Notifications (native alarms)
  - Push Notifications
  - Splash Screen
  - Status Bar

## Database Schema

### Core Tables
- `users` - User accounts, subscription status, authentication info
- `alarms` - Alarm configurations with voice/text options
- `medicines` - Medicine reminders with photos and schedules
- `meetings` - Meeting schedules and details
- `push_subscriptions` - Push notification endpoints
- `sessions` - Express session storage
- `otp_codes` - Phone verification OTPs

## Key Features & Requirements

### Development Workflow
1. **Local Development**:
   - Run `npm run dev` to start development server
   - Server runs on port 5000 (configurable via PORT env var)
   - Hot reload enabled for both frontend and backend
   - Uses Vite dev server for frontend

2. **Database Setup**:
   - Uses Neon PostgreSQL (cloud) or local PostgreSQL
   - Run `npm run db:push` to sync schema
   - Drizzle ORM for type-safe database queries

3. **Mobile Build**:
   - Run `npm run build` to build web assets
   - Run `npx cap sync android` to sync to Android project
   - Open in Android Studio: `npx cap open android`
   - Build APK from Android Studio

### Environment Configuration

**Required Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for session encryption
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` - For push notifications

**Optional Variables**:
- `PORT` - Server port (default: 5000)
- `APP_DOMAIN` - Domain name for HTTPS (required for push in production)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment gateway
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - Payment gateway
- `FAST2SMS_API_KEY` - SMS service for OTP

### Current Database Configuration
```
DATABASE_URL=postgresql://neondb_owner:npg_pbSPJVE93ksZ@ep-frosty-poetry-a6lqpn4q.us-west-2.aws.neon.tech/neondb?sslmode=require
PGDATABASE=neondb
PGHOST=ep-frosty-poetry-a6lqpn4q.us-west-2.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_pbSPJVE93ksZ
```

## Development Goals

### Immediate Tasks
1. **Set up local development environment**
   - Create `.env` file with provided database credentials
   - Generate SESSION_SECRET and VAPID keys
   - Run `npm install` and `npm run db:push`
   - Start development server with `npm run dev`

2. **Test core functionality**
   - User authentication (email/password, phone/OTP)
   - Create and manage alarms
   - Medicine reminders
   - Meeting notifications
   - Push notifications

3. **Build for mobile**
   - Run `npm run build`
   - Sync with Capacitor: `npx cap sync android`
   - Update `capacitor.config.ts` with production server URL
   - Build APK in Android Studio

### Future Enhancements
- iOS app support
- More language options
- Advanced alarm customization
- Medicine interaction warnings
- Calendar integration
- Cloud backup/sync

## Project Structure

```
Royal-Speaking-Alarm/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and helpers
│   │   ├── pages/       # Page components (Home, Settings, etc.)
│   │   └── App.tsx      # Main app entry
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── routes.ts        # API route handlers
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access layer
│   ├── alarmScheduler.ts # Alarm scheduling logic
│   └── pushNotification.ts # Push notification handling
├── shared/              # Shared code
│   ├── schema.ts        # Database schema (Drizzle)
│   └── routes.ts        # API route definitions
├── android/             # Android native project
├── capacitor.config.ts  # Capacitor configuration
└── package.json         # Dependencies and scripts
```

## Important Notes

1. **HTTPS Required**: Push notifications require HTTPS in production. Use a domain with SSL certificate.

2. **Background Alarms**: Android native alarms work even when screen is off. Users need to:
   - Grant notification permissions
   - Disable battery optimization for the app
   - Enable auto-start (on some devices)

3. **Database**: Currently using Neon PostgreSQL cloud database. Can switch to local PostgreSQL for development.

4. **Build Process**: 
   - Web build: `npm run build` → creates `dist/` folder
   - Mobile sync: `npx cap sync android` → copies web assets to Android project
   - Android build: Done in Android Studio

5. **Environment**: Development uses Vite dev server, production serves static files from `dist/public`.

## Getting Started

1. Clone repository: `git clone git@github.com:pragnesh64/Royal-Speaking-Alarm.git`
2. Install dependencies: `npm install`
3. Create `.env` file with database credentials and secrets
4. Push database schema: `npm run db:push`
5. Start development: `npm run dev`
6. For mobile: Build → Sync → Open in Android Studio → Build APK

## Support & Documentation

- See `README.md` for detailed setup instructions
- See `DEPLOY_GUIDE.md` for deployment guide
- See `BUILD_APK.md` for Android build instructions

