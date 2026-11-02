# RemoteJobsPK — Deploy & DNS

## Skip Vercel for now

Vercel phone verification can block new accounts (`verification phone number has been temporarily blocked`). **Do not wait 12 hours** — use **Render** (or Railway) with the included Docker image and SQLite volume. No Neon/Postgres required for this path.

## What we confirmed

| Item | Status |
|------|--------|
| Domain `remotejobspk.com` | Active on **Squarespace Domains** |
| Google Workspace | Domain verified; finish email for `hello@` |
| DNS today | Squarespace parking A/CNAME + Google MX/SPF/DKIM — **keep MX** |
| Local app | http://localhost:3000 |
| Vercel | Blocked by phone OTP — use Render instead |

---

## Path A — Render (recommended, no Vercel)

**Code is already on GitHub:** https://github.com/tradereval/remotejobspk  

Blueprint link (sign in with GitHub first):  
https://dashboard.render.com/blueprint/new?repo=https%3A%2F%2Fgithub.com%2Ftradereval%2Fremotejobspk

### 1) Sign in to Render with GitHub

1. Open the Blueprint link above  
2. Click **GitHub** (not Google / not Vercel)  
3. Approve access for the `tradereval` GitHub account  

### 2) Deploy from Blueprint / Docker

1. Confirm `render.yaml` / Docker service `remotejobspk`  
2. Disk at `/data` for SQLite  
3. Environment:

```
AUTH_SECRET=<long-random>
ADMIN_EMAIL=admin@remotejobspk.com
ADMIN_PASSWORD=<strong-password>
CRON_SECRET=<long-random>
NEXT_PUBLIC_SITE_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_SITE_NAME=RemoteJobsPK
DATABASE_URL=file:/data/prod.db
RUN_SEED=true
RUN_IMPORT=true
```

6. Deploy. First boot runs migrations, seed, Himalayas import, then `next start`.  
7. After first success, set `RUN_SEED=false` and `RUN_IMPORT=false` (re-import via cron/`npm run import:jobs` later).

### 4) Custom domain on Render

Render → Settings → Custom Domains → add `www.remotejobspk.com` (and apex if offered). Copy the CNAME/A targets they show.

### 5) Squarespace DNS (keep Google email)

Squarespace → Domains → `remotejobspk.com` → DNS  

**Do not delete** Google MX / SPF / DKIM.

| Type | Name | Data |
|------|------|------|
| CNAME | `www` | *(target from Render)* |
| A / ALIAS | `@` | *(apex target from Render, if any)* |

Remove or replace the old Squarespace **parking** website A/CNAME only.

---

## Path B — Railway (same idea)

Docker + volume at `/data`, same env vars. Sign up with GitHub/email at https://railway.app — not Vercel.

## Path C — Retry Vercel later

After 12 hours, or with a **different phone**, or GitHub login if Vercel allows it without SMS. Still need Postgres (Neon) for Vercel serverless — Docker path above avoids that.

## Local admin

- http://localhost:3000  
- `admin@remotejobspk.com` / `admin123456` — **change before public**

## Spreadsheet CRM (signups + paying customers)

1. Create a Google Sheet → tab name `Leads`  
2. Paste `scripts/google-apps-script-leads.gs` into **Extensions → Apps Script**  
3. Deploy as **Web app** (Execute as Me, Anyone)  
4. Set Render env `LEADS_SHEET_WEBHOOK_URL` to that URL  
5. New signups, profile updates, and Premium grants append rows automatically  
6. Backup anytime: Admin → **Download CSV**

## Still on you

1. Render (or Railway) account + GitHub push  
2. Squarespace DNS edit after you have the host URL  
3. Finish Google Workspace email for `hello@remotejobspk.com`  
4. Safepay for paid subscriptions later  
5. Paste Apps Script webhook URL into Render env for live CRM sync  

