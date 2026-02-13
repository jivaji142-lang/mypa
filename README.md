# Royal-Speaking-Alarm (MyPA)

A comprehensive alarm and reminder application with speaking alarms, medicine reminders, and meeting notifications. Built with React, Express, PostgreSQL, and Capacitor for cross-platform mobile support.

## 🚀 Features

- **Speaking Alarms**: Custom voice alarms with text-to-speech support
- **Medicine Reminders**: Track medications with photos and custom voice reminders
- **Meeting Notifications**: Schedule and manage meetings with reminders
- **Push Notifications**: Native push notifications for Android/iOS
- **Multi-language Support**: English and other language support
- **Subscription Management**: Trial period and subscription handling with Stripe/Razorpay
- **Voice Recording**: Record custom voice messages for alarms
- **Background Alarms**: Works even when screen is off (Android native)

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Radix UI** components
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Capacitor** for mobile app

### Backend
- **Express.js** (v5) with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **Express Sessions** with PostgreSQL storage
- **Web Push** for push notifications
- **Multer** for file uploads
- **Stripe/Razorpay** for payments

### Mobile
- **Capacitor Android** for native Android features
- **Local Notifications** plugin
- **Push Notifications** plugin
- **Splash Screen** and **Status Bar** plugins

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 14+ (or use Neon/other cloud PostgreSQL)
- **npm** or **yarn**
- **Android Studio** (for building Android APK)

## 🔧 Local Development Setup

### 1. Clone the Repository

```bash
git clone git@github.com:pragnesh64/Royal-Speaking-Alarm.git
cd Royal-Speaking-Alarm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:npg_pbSPJVE93ksZ@ep-frosty-poetry-a6lqpn4q.us-west-2.aws.neon.tech/neondb?sslmode=require
PGDATABASE=neondb
PGHOST=ep-frosty-poetry-a6lqpn4q.us-west-2.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_pbSPJVE93ksZ

# Session Configuration
SESSION_SECRET=your-random-secret-string-here-generate-with-openssl-rand-hex-32

# Server Configuration
PORT=5000
NODE_ENV=development

# Application Domain (for production)
APP_DOMAIN=yourdomain.com

# Payment Gateways (Optional - add when needed)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Push Notifications (VAPID Keys)
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here

# SMS Service (Optional)
FAST2SMS_API_KEY=your_fast2sms_api_key
```

**Generate SESSION_SECRET:**
```bash
openssl rand -hex 32
```

**Generate VAPID Keys:**
```bash
npx web-push generate-vapid-keys
```

### 4. Set Up Database

```bash
# Push database schema
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend + API**: http://localhost:5000
- **API Routes**: http://localhost:5000/api/*

## 📱 Building for Mobile (Android)

### 1. Build Web Assets

```bash
npm run build
```

### 2. Sync Capacitor

```bash
npx cap sync android
```

### 3. Update Capacitor Config

Edit `capacitor.config.ts` to point to your server:

```typescript
server: {
  url: 'https://yourdomain.com', // Your production server URL
  androidScheme: 'https',
  cleartext: true // Only for development
}
```

### 4. Open in Android Studio

```bash
npx cap open android
```

### 5. Build APK

1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 6. Install on Device

```bash
# Via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or transfer APK to device and install manually
```

## 🏗️ Project Structure

```
Royal-Speaking-Alarm/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main app component
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── routes.ts           # API route handlers
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   ├── alarmScheduler.ts   # Alarm scheduling logic
│   └── pushNotification.ts # Push notification handling
├── shared/                 # Shared code between client/server
│   ├── schema.ts           # Database schema (Drizzle)
│   └── routes.ts           # API route definitions
├── android/                # Android native project
├── capacitor.config.ts     # Capacitor configuration
├── package.json            # Dependencies and scripts
└── .env                    # Environment variables (not in git)
```

## 📜 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run check` - Type check TypeScript
- `npm run db:push` - Push database schema changes

## 🔐 Authentication

The app supports multiple authentication methods:
- **Email/Password** - Traditional email-based auth
- **Phone/OTP** - Phone number verification with OTP
- **Google OAuth** - Google sign-in (if configured)

## 📊 Database Schema

Key tables:
- `users` - User accounts and subscription info
- `alarms` - Alarm configurations
- `medicines` - Medicine reminders
- `meetings` - Meeting schedules
- `push_subscriptions` - Push notification subscriptions
- `sessions` - Express session storage

## 🚀 Deployment

See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) for detailed deployment instructions.

### Quick Production Build

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/index.cjs --name royal-alarm
pm2 save
pm2 startup
```

## 🔔 Push Notifications Setup

1. Generate VAPID keys and add to `.env`
2. Ensure HTTPS is enabled (required for push notifications)
3. Update `APP_DOMAIN` in `.env` with your domain
4. Users must grant notification permissions in the app

## 🐛 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure SSL mode matches your database provider

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Check Node.js version: `node -v` (should be 20+)

### Android Build Issues
- Run `npx cap sync android` after any changes
- Clean Android build: In Android Studio → Build → Clean Project
- Invalidate caches: File → Invalidate Caches / Restart

### Push Notifications Not Working
- Verify HTTPS is enabled (required)
- Check VAPID keys are correct
- Ensure notification permissions are granted
- Check browser/device notification settings

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `PORT` | No | Server port (default: 5000) |
| `APP_DOMAIN` | No | Your domain for HTTPS (required for push) |
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for push notifications |
| `RAZORPAY_KEY_ID` | Optional | Razorpay payment gateway key |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay payment gateway secret |
| `STRIPE_SECRET_KEY` | Optional | Stripe payment gateway key |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Stripe payment gateway public key |

## 📄 License

MIT

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.
