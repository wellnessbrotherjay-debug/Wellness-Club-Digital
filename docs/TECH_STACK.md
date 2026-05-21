# Tech Stack

## Project Identity
- **repo name**: wellness-club-digital
- **project purpose**: Digital voucher and wellness management system for hotels
- **business module**: Voucher layer in HTF / TS Group ecosystem
- **ecosystem role**: Provides guest voucher issuance, redemption tracking, and analytics

## Stack
- **frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM 7
- **backend**: Hono.js, Node.js, TypeScript
- **language**: TypeScript
- **package manager**: npm
- **database**: Supabase (PostgreSQL)
- **ORM**: None (direct Supabase client)
- **auth**: None (public access with RLS policies)
- **hosting**: Vercel
- **storage**: Supabase Storage (for images), IndexedDB (for offline resilience)
- **email**: Resend
- **analytics**: Custom implementation (no external analytics detected)
- **chatbot**: Not implemented
- **payments**: Not implemented
- **APIs**: Custom REST API with Hono.js
- **automation**: Cron jobs for daily backups
- **testing**: No testing framework detected
- **build tools**: Vite, TypeScript compiler, ESLint

## Scripts
| Script | Purpose | Status |
|--------|---------|--------|
| `npm run dev` | Start both API and web development servers | ✅ |
| `npm run build` | Build both API and web applications | ✅ |
| `npm run start` | Start production API server | ✅ |
| `npm run lint` | Run ESLint on web app | ✅ |
| `apps/api/dev` | Start API server with tsx watch | ✅ |
| `apps/api/build` | Build API to TypeScript | ✅ |
| `apps/api/start` | Run built API | ✅ |
| `apps/api/typecheck` | Type check API | ✅ |
| `apps/web/dev` | Start Vite development server | ✅ |
| `apps/web/build` | Build Vite production bundle | ✅ |
| `apps/web/lint` | Run ESLint | ✅ |
| `apps/web/preview` | Preview Vite production build | ✅ |

## Environment Variables
List variable names only, no values.

| Env Name | Purpose | Required? | Secret? | Notes |
|----------|---------|-----------|---------|-------|
| SUPABASE_URL | Supabase project URL | Yes | No | Public endpoint |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin key | Yes | Yes | Bypasses RLS |
| VITE_SUPABASE_URL | Frontend Supabase URL | Yes | No | Public env var |
| VITE_SUPABASE_ANON_KEY | Frontend Supabase key | Yes | No | Public env var |
| RESEND_API_KEY | Resend email service | Yes | Yes | For notifications |
| APPS_SCRIPT_URL | Google Sheets mirror | No | No | Optional mirroring |
| OPENWEATHER_API_KEY | Weather service | No | No | Optional analytics |
| PORT | API server port | No | No | Defaults to 3001 |
| NODE_ENV | Node environment | No | No | development/production |
| WHATSAPP_NUMBER | WhatsApp contact number | No | No | For bookings |
| APPS_SCRIPT_URL | Google Apps Script URL | No | No | For data operations |

## Development Dependencies
### Root
- @hono/node-server: Hono Node.js server adapter
- @supabase/supabase-js: Supabase client library
- hono: Web framework
- concurrently: Run multiple commands in parallel

### API (`apps/api`)
- @hono/node-server: Node.js server adapter
- @hono/node-ws: WebSocket support
- @supabase/supabase-js: Supabase client
- dotenv: Environment variable management
- hono: Web framework
- pdf-parse-new: PDF parsing
- resend: Email service
- zod: Schema validation

### Web (`apps/web`)
- @supabase/supabase-js: Supabase client
- html5-qrcode: HTML5 QR code scanner
- lucide-react: Icon library
- react: UI framework
- react-dom: DOM rendering
- react-helmet-async: SEO management
- react-qr-code: QR code generation
- react-router-dom: Routing
- idb: IndexedDB wrapper
- @tanstack/react-table: Data tables
- date-fns: Date utilities

### Build Tools
- @vitejs/plugin-react: Vite React plugin
- typescript: TypeScript compiler
- @types/node: Node.js types
- @types/react: React types
- @types/react-dom: React DOM types
- tailwindcss: CSS framework
- autoprefixer: CSS prefixer
- postcss: CSS processor
- eslint: Code linting
- @eslint/js: ESLint configs

## Key Libraries and Patterns
- **Local-First Architecture**: Uses IndexedDB for offline resilience, syncs to Supabase
- **RESTful API**: Hono.js provides lightweight REST endpoints
- **Type Safety**: Zod for runtime validation, TypeScript for compile-time
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **QR Code Handling**: Both generation and scanning capabilities
- **WebSocket Support**: Real-time updates capability
- **Micro-frontends**: Separate API and web apps in monorepo