# Wellness Club Digital - Monorepo

This project consists of:
- `apps/web`: React + Vite frontend application
- `apps/api`: Hono backend application

## Setup
1. Duplicate `.env.example` to `.env` in appropriate folders.
2. `npm install` from the root directory.

## Development
Run `npm run dev` from the root directory to start both the frontend and backend concurrently.

- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:3001`

## Vercel Deployment
This repository is configured natively for **Vercel**. When importing the repository into Vercel:

1. **Framework Preset**: Vercel will attempt to auto-detect Vite. Ensure the Framework Preset is set to **Vite** (if it isn't automatically).
2. **Build Command**: Leave as default (`npm run build --workspace=apps/web` is set in `vercel.json`).
3. **Output Directory**: Leave as default (`apps/web/dist` is mapped in `vercel.json`).
4. **Environment Variables**: Add your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc.
5. **Install Command**: `npm install` (this installs both root and workspace dependencies).

Vercel will successfully serve the frontend Vite app and automatically compile `api/index.ts` into a Serverless Function connecting directly to the Hono backend logic.
