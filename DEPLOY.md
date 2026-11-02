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

### 1) Create account (no Vercel phone)

1. Open https://dashboard.render.com/register  
2. Prefer **Continue with GitHub** or **email/password** (avoid Google if that also forces phone).  
3. Verify email if asked.

### 2) Get code onto GitHub

From `remotejobspk/` (after Git is installed):

```bash
git init
git add .
git commit -m "Initial RemoteJobsPK"
# Create empty repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/remotejobspk.git
git branch -M main
git push -u origin main
```

### 3) New Web Service on Render

1. **New → Web Service** → connect the GitHub repo  
2. Runtime: **Docker** (uses `Dockerfile`)  
3. Instance: Free or starter  
4. Disk: add a **persistent disk** mounted at `/data` (for SQLite)  
5. Environment:

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

## Still on you

1. Render (or Railway) account + GitHub push  
2. Squarespace DNS edit after you have the host URL  
3. Finish Google Workspace email for `hello@remotejobspk.com`  
4. Safepay for paid subscriptions later  
