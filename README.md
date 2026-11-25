# LINKORA — Dynamic URL Shortener, QR Rescue & Click Analytics

Zero-Docker, zero-external-setup full-stack application running 100% natively on Node.js with **SQLite** (Prisma) and an **in-memory Redis-compatible Cache + `setImmediate()` Async Click Queue**.

## Quick Start (Zero External Services Required)

```bash
npm run install:all
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API & Redirector:** http://localhost:4000
- **Demo Account:** `demo@linkora.io` / `Demo@1234` (1-click fill button on `/login`)

## Environment Configuration (`PUBLIC_BASE_URL`)

- **Development (`backend/.env` & `frontend/.env`):**
  - `PUBLIC_BASE_URL=http://localhost:4000`
  - `FRONTEND_URL=http://localhost:5173`
  - `VITE_API_URL=http://localhost:4000`
  - `VITE_PUBLIC_BASE_URL=http://localhost:4000`
- **Production:**
  - `NODE_ENV=production`
  - `PUBLIC_BASE_URL=https://your-actual-domain.com` (backend)
  - `FRONTEND_URL=https://your-frontend-domain.com` (backend CORS & rescue fallback)
  - `VITE_API_URL=https://your-actual-domain.com` (frontend)
  - `VITE_PUBLIC_BASE_URL=https://your-actual-domain.com` (frontend)
