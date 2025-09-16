# Next-Scheduler (Frontend)

This README documents the frontend subproject for Next-Scheduler — a production-ready appointment scheduling platform built with Next.js, Supabase, Prisma, Google OAuth/Calendar, and Gmail SMTP. It covers setup, environment variables, deployment on Vercel, and common troubleshooting steps.

---

## 1. Project Overview

Next-Scheduler is a full-stack appointment scheduling application. The frontend (this folder) is built with Next.js and contains UI, API routes, and integration points for authentication, AI, and calendar sync. Major capabilities:

- Google OAuth authentication (NextAuth)
- Buyer & Seller roles (dynamically assigned)
- Seller availability management (weekly & date-specific)
- Booking flow with slot locking
- Confirmation emails via Gmail SMTP
- Google Calendar sync for created/cancelled events
- AI assistant endpoint for natural-language scheduling support
- Deployed on Vercel

---

## 2. Tech Stack

- Next.js — Frontend & API routes
- Prisma — Type-safe ORM
- Supabase (PostgreSQL) — Database
- NextAuth.js — Authentication (Google provider)
- Gmail SMTP — Email delivery
- Google Calendar API — Event sync
- NodeCache — In-memory caching
- Cron Jobs — Background tasks
- Deployment: Vercel

---

## 3. Features

Implemented features:

- Google OAuth sign-in (NextAuth)
- Dynamic Buyer / Seller roles
- Seller availability (weekly and date overrides)
- Buyer booking flow with slot locking
- Confirmation emails for both parties
- Google Calendar integration
- Responsive UI (mobile and desktop)
- Dummy-seller seeding scripts for testing
- NodeCache for AI response caching
- Cron jobs for cleanup and scheduled tasks
- Monitoring & performance toggles

Planned features:

- Advanced AI assistant workflows
- SMS/WhatsApp notifications
- Analytics dashboards
- Custom domain & multi-tenant support

---

## 4. Project Structure

Key directories:

```
/frontend
  /components
  /lib
  /pages
    /api
  /prisma
  /scripts
  /styles
  .env (local only - ignored)
```

- `components/` — shared React components
- `lib/` — helpers and Prisma client
- `pages/api/` — serverless API endpoints
- `prisma/` — schema and migrations
- `scripts/` — seeding and utility scripts

---

## 5. Environment Variables

Create `.env.local` for local development and configure production variables in Vercel.

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

DATABASE_URL=postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/postgres?sslmode=require

EMAIL_SERVICE=gmail
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

GEMINI_API_KEY=
TOKEN_ENCRYPTION_KEY=

ENABLE_CACHING=true
CACHE_DEFAULT_TTL=60
AI_CACHE_TTL=30
APPOINTMENTS_CACHE_TTL=300
ENABLE_CRON_JOBS=true
ENABLE_PERFORMANCE_TRACKING=true
```

Notes:
- Use Gmail App Passwords for `EMAIL_PASS` in production
- Ensure `NEXTAUTH_URL` matches your deployed domain
- On Vercel, add all environment variables under Project → Settings → Environment Variables

---

## 6. Setup & Installation (Local)

1. Clone repository and navigate to frontend:

```bash
git clone https://github.com/Trideep-2k26/Next-Scheduler.git
cd Next-Scheduler/frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` and populate variables from section 5.

4. Generate Prisma client & apply migrations:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> If working against an existing Supabase DB with data, use `npx prisma db pull` to introspect.

5. Start development server:

```bash
npm run dev
# open http://localhost:3000
```

---

## 7. Deployment (Vercel)

1. Connect your GitHub repo to Vercel and create the project.
2. Add all environment variables in Vercel Project Settings.
3. Ensure `NEXTAUTH_URL` is set to `https://<your-deployment>.vercel.app`.
4. In Google Cloud Console, add authorized redirect URIs:

```
https://<your-deployment>.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

5. Build script should generate Prisma client during build. Example `package.json`:

```json
"scripts": {
  "build": "prisma generate && next build",
  "dev": "next dev -p 3000"
}
```

6. Deploy and monitor logs for any Prisma or OAuth errors.

---

## 8. Known Issues & Fixes

- **Prisma P1001 (Can't reach DB)**: Ensure `DATABASE_URL` is correct and DNS reachable. URL-encode special characters in the password (e.g., `@` → `%40`).
- **Prisma migrations on existing DB**: Use `prisma migrate resolve` to baseline or use `prisma db pull` to introspect.
- **Google OAuth "unverified app"**: Add test users or publish OAuth consent screen. Ensure redirect URIs and authorized domains are set.
- **Email delivery failures**: Use Gmail App Passwords or a robust email provider.
- **NodeCache in serverless**: It's in-memory and ephemeral — consider Redis for persistence.

---

## 9. Contributing

- Open issues for bugs or features
- Use feature branches and submit PRs
- Do not commit secrets (.env)

---

## 10. License

This project is MIT licensed. See the root `LICENSE` file for details.

---

If you want, I can also:

- Add a root-level `README.md` (project-wide) summarizing both frontend and backend
- Create a `.env.example` with required keys
- Add a `LICENSE` file with MIT text

Feel free to ask which additional files you want me to add.