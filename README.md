# RemoteJobsPK

Pakistan-focused remote job board. Free browse + apply. Premium (Rs 999 / $3) for verified filters and alerts.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (swap `DATABASE_URL` to Postgres/Supabase later)
- Himalayas Jobs API (with attribution + preserved apply links)
- Cookie sessions (email/password)
- Safepay / Resend hooks ready via env (not required for local MVP)

## Quick start

```bash
cd remotejobspk
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run import:jobs
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default admin

- Email: `admin@remotejobspk.com` (or `ADMIN_EMAIL` in `.env`)
- Password: `admin123456` (or `ADMIN_PASSWORD`)

Change these before any public deploy.

## Daily job refresh

When reminded in Cursor, or manually:

```bash
npm run import:jobs
```

Or call the cron endpoint:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/import
```

Admin UI (`/admin`) can also run import, verify eligibility, hide dead jobs, upload CSV, and grant Premium.

## Pricing (product)

| Plan | Price | Includes |
|------|-------|----------|
| Free | Rs 0 | Browse, details, apply, basic filters |
| Premium PK | Rs 999/mo | Verified + beginners filters, alerts |
| Premium Intl | $3/mo | Same premium features |

Safepay merchant approval is required before live charging. Until then, grant Premium from Admin.

## Himalayas compliance

- Use API `applicationLink` for Apply
- Credit Himalayas visibly
- Do not republish into Google Jobs / other aggregators
- Remove expired jobs

## Deploy notes

See **[DEPLOY.md](./DEPLOY.md)** for the live checklist.

Summary:
1. Domain `remotejobspk.com` is on **Squarespace** (Google Workspace email)
2. Local SQLite works; production serverless needs **Neon/Supabase Postgres**
3. Use `npm run build` (compile mode) to avoid Next 16 `/_global-error` prerender flake
4. Point DNS at Vercel/Cloudflare after host URL exists — keep Google MX/SPF/DKIM
5. Contact: hello@remotejobspk.com
