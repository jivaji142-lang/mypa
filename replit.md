# MyPA - Your Personal Assistant

## Overview

MyPA is a personal voice assistant Progressive Web App (PWA) for managing daily routines, medicine reminders, and meetings. The app features speaking alarms with custom voice recordings, medicine tracking with photo support, meeting scheduling, and multi-language support for 18+ global languages (English, Hindi, Marathi, Spanish, French, German, Chinese, Japanese, Arabic, Russian, Portuguese, Bengali, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi). Built with a React frontend and Express backend using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2026)

- Rebranded app from "PA Alarm" to "MyPA"
- Renamed "My Alarms" section to "My Routine"
- Added new Home page with large clock display, day indicator, and three option cards
- Added new Meetings feature with full CRUD operations
- Expanded language support to 18 major world languages with global settings
- Fixed alarm system with 12-hour time format (AM/PM)
- Implemented active alarm popup with image display, TTS, and snooze functionality
- Fixed image upload to use base64 encoding for unlimited size support
- **Stripe Payment Integration**: Monthly (₹45) and Yearly (₹369) subscription plans with 30-day free trial
- **Webhook Auto-Activation**: Subscription status automatically updates via Stripe webhooks
- **Customer Portal**: Users can manage billing, update payment methods, and cancel subscriptions

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom royal blue theme (Paytm-inspired #002E6E to #00BAF2 gradients)
- **Typography**: Cambria serif font with italic text by default, non-italic numbers
- **Build Tool**: Vite with HMR support

### Page Structure
- **Home** (`/`) - Main dashboard with clock display and navigation cards
- **My Routine** (`/routine`) - Alarm and routine management
- **My Medicines** (`/medicines`) - Medicine reminders with photo support
- **My Meetings** (`/meetings`) - Meeting scheduling and management
- **Settings** (`/settings`) - Language preferences and user settings

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **File Structure**: 
  - `server/` - Express routes, middleware, database access
  - `server/replit_integrations/auth/` - Authentication module

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Tables**:
  - `sessions` - Auth session storage
  - `users` - User profiles with subscription status and language preferences
  - `alarms` - Alarm configurations with voice/image support, recurring days, or specific dates
  - `medicines` - Medicine reminders with photo and dosage tracking
  - `meetings` - Meeting schedules with date, time, location, and participants
- **Migrations**: Drizzle Kit with `db:push` command

### API Structure
- Typed API routes defined in `shared/routes.ts` with Zod schemas
- CRUD endpoints for alarms (`/api/alarms`), medicines (`/api/medicines`), and meetings (`/api/meetings`)
- File upload endpoint (`/api/upload`) for voice recordings and images
- User settings endpoint (`/api/user/settings`) for language preferences
- Auth endpoints via Replit Auth (`/api/login`, `/api/logout`, `/api/auth/user`)

### Shared Code
- `shared/schema.ts` - Database schemas and Zod validation types
- `shared/routes.ts` - API route definitions with input/output schemas
- Path aliases: `@/` for client, `@shared/` for shared code

## Alarm Types

The app supports four alarm types:
1. **Speaking** - Text-to-speech announcements in selected language
2. **My Voice** - Custom recorded voice messages
3. **Music** - Custom audio file playback
4. **Vibration** - Device vibration patterns

## External Dependencies

### Database
- PostgreSQL (required, connection via DATABASE_URL environment variable)
- Drizzle ORM for type-safe database operations

### Authentication
- Replit Auth (OpenID Connect) for user authentication
- Requires ISSUER_URL, REPL_ID, and SESSION_SECRET environment variables

### Frontend Libraries
- TanStack React Query for data fetching
- Radix UI primitives for accessible components
- date-fns for date formatting
- Lucide React for icons

### Development Tools
- Vite with React plugin
- Replit-specific plugins for error overlay and dev banner
- esbuild for production server bundling
