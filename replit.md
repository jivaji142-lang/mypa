# PA Alarm - Personal Voice Assistant

## Overview

PA Alarm is a personal voice assistant application for managing alarms and medicine reminders. The app features speaking alarms with custom voice recordings, medicine tracking with photo support, and multi-language support (English, Hindi, Marathi). Built with a React frontend and Express backend using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom royal blue theme (Paytm-inspired #002E6E to #00BAF2 gradients)
- **Typography**: Cambria serif font with italic text by default, non-italic numbers
- **Build Tool**: Vite with HMR support

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
- **Migrations**: Drizzle Kit with `db:push` command

### API Structure
- Typed API routes defined in `shared/routes.ts` with Zod schemas
- CRUD endpoints for alarms (`/api/alarms`) and medicines (`/api/medicines`)
- File upload endpoint (`/api/upload`) for voice recordings and images
- Auth endpoints via Replit Auth (`/api/login`, `/api/logout`, `/api/auth/user`)

### Shared Code
- `shared/schema.ts` - Database schemas and Zod validation types
- `shared/routes.ts` - API route definitions with input/output schemas
- Path aliases: `@/` for client, `@shared/` for shared code

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
- Framer Motion for animations (in requirements)

### Development Tools
- Vite with React plugin
- Replit-specific plugins for error overlay and dev banner
- esbuild for production server bundling