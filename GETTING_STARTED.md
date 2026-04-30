# CivilIQ — Getting Started (No Docker Required)

---

## ⚠️ Before Anything: Find Your Folder Path

**To find the path of your `civiliq` folder on Mac:**
1. Open **Finder**
2. Navigate to the **Civil CRM** folder
3. Right-click the `civiliq` folder → **Get Info**
4. The **"Where:"** line shows the parent path — e.g. `/Users/pradhap-21870/Documents/Civil CRM`

Open **Terminal** and navigate there — use YOUR actual path:
```bash
cd "/Users/pradhap-21870/Documents/Claude/Projects/Civil CRM/civiliq"
ls
# Should show: apps  docker-compose.yml  package.json  GETTING_STARTED.md
```

---

## Prerequisites

### 1. Install Node.js 20+
Download from https://nodejs.org (click the **LTS** button)
```bash
node --version
# Should show v20.x.x or higher
```

### 2. Install Homebrew (Mac package manager)
If you don't have it:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow any extra commands it prints at the end to add `brew` to your PATH.

---

## Step 1: Set Up PostgreSQL (via Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

Wait 5 seconds, then create the database and user:
```bash
psql postgres -c "CREATE USER civiliq WITH PASSWORD 'civiliq_dev_password';"
psql postgres -c "CREATE DATABASE civiliq_dev OWNER civiliq;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE civiliq_dev TO civiliq;"
```

Enable required database extensions:
```bash
psql civiliq_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql civiliq_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql civiliq_dev -c "CREATE EXTENSION IF NOT EXISTS unaccent;"
```

Install pgvector (for AI embeddings):
```bash
brew install pgvector
psql civiliq_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Verify it works:
```bash
psql "postgresql://civiliq:civiliq_dev_password@localhost:5432/civiliq_dev" -c "SELECT version();"
# Should print the PostgreSQL version line — you're good
```

---

## Step 2: Set Up Redis (via Homebrew)

```bash
brew install redis
brew services start redis
```

Verify Redis is working:
```bash
redis-cli ping
# Should print: PONG
```

---

## Step 3: Environment Setup

```bash
# Run from inside the civiliq folder
cp .env.example .env
```

Open `.env` in any text editor and update these values:

```
JWT_SECRET=<run this to generate one: openssl rand -base64 64>
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
REDIS_URL=redis://localhost:6379
```

Leave everything else as-is. The app works without Google DocAI, S3, OpenAI, or Firebase in local dev.

---

## Step 4: Install API Dependencies & Run Migrations

```bash
cd "/Users/pradhap-21870/Documents/Civil CRM/civiliq/apps/api"
npm install
npx prisma generate
npx prisma migrate dev --name init
```

You should see: `Your database is now in sync with your schema.`

Apply RLS security policies (run once):
```bash
psql "postgresql://civiliq:civiliq_dev_password@localhost:5432/civiliq_dev" -f prisma/rls-policies.sql
```

---

## Step 5: Start the API

```bash
# Still inside apps/api/
npm run start:dev
```

✅ API running at: http://localhost:4000/api/v1
✅ Swagger docs: http://localhost:4000/api/docs

---

## Step 6: Start the Web App (new Terminal tab)

```bash
cd "/Users/pradhap-21870/Documents/Civil CRM/civiliq/apps/web"
npm install
npm run dev
```

✅ Web app at: http://localhost:3000

---

## Step 7: Seed Demo Data (one command)

This creates a full demo workspace — firm, 5 users, 4 projects (₹858 Cr portfolio), materials, bills, and AI agent history.

```bash
cd "/Users/pradhap-21870/Documents/Civil CRM/civiliq/apps/api"
npm run db:seed
```

When it's done, you'll see:

```
🎉  Seeding complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🌐  App URL   →  http://localhost:3000
  📧  Email     →  admin@abcconstructions.in
  🔑  Password  →  Demo@CivilIQ2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Open http://localhost:3000 and sign in with those credentials.

> **What's seeded:**
> - Firm: ABC Constructions Pvt Ltd
> - 4 Projects: NH-48 highway, Prestige Celestia, Vandalur Expressway, completed Lakeside Habitat
> - 7 Materials with real specs (1 steel grade mismatch pre-flagged 🔴)
> - 5 RA Bills (₹8.5 Cr pending certification, ₹3 Cr submitted)
> - 4 AI agent job runs (Reconciliation, Risk, Intake, Chase)
> - 4 Notifications (2 unread critical/warnings)
> - 5 Team members across all roles

---

### Or: Register Your Own Firm Instead

Skip seeding and go to http://localhost:3000/register to set up your own workspace manually.

---

## Stopping & Starting Again Later

```bash
# Stop services
brew services stop redis
brew services stop postgresql@16

# Start again next session
brew services start postgresql@16
brew services start redis
# Then run: npm run start:dev  and  npm run dev
```

---

## Alternative: Fully Cloud (zero local installs)

If Homebrew gives you trouble, use free cloud services instead — no installation needed:

### PostgreSQL → Neon (free tier, pgvector built-in)
1. Sign up at https://neon.tech
2. Create a project named `civiliq`
3. Copy the **Connection string** — it looks like:
   `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Paste it as `DATABASE_URL=` in your `.env`

### Redis → Upstash (free tier)
1. Sign up at https://upstash.com
2. Create a Redis database (pick a region close to you)
3. Copy the **Redis URL** — it looks like:
   `rediss://default:xxxxxxxx@xxx.upstash.io:6379`
4. Paste it as `REDIS_URL=` in your `.env`

Then skip Steps 1 and 2 above entirely.

---

## Step 8: Test the Document Pipeline

```bash
curl -X POST http://localhost:4000/api/v1/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your-boq.pdf" \
  -F "projectId=YOUR_PROJECT_ID" \
  -F "type=BOQ"
```

---

## Sprint 1 Checklist (Weeks 1-4)

- [ ] PostgreSQL + Redis running (Homebrew or cloud)
- [ ] `npx prisma migrate dev` succeeds
- [ ] API up at localhost:4000/api/docs
- [ ] First tenant registered and logged in
- [ ] First project created via API
- [ ] Template schema uploaded for a design-partner firm
- [ ] End-to-end document upload → OCR → extraction → Excel working
- [ ] Socket.io real-time updates visible in browser on document complete

## Next: Sprint 2 (Weeks 5-8)

- Configure Google Document AI (get 95%+ OCR accuracy)
- Build the Projects dashboard UI
- Implement Running Account Bills module
- Add Chase Agent cron job

---

## Architecture Reference

See the `Civil CRM/` folder for:
- `CivilIQ_SME_Analysis.docx` — Full market analysis and product blueprint
- `CivilIQ_Architecture_ADRs.docx` — All 6 Architecture Decision Records

Key ADRs for getting started:
- **ADR-001**: Why NestJS Modular Monolith (not microservices)
- **ADR-002**: The full document processing pipeline
- **ADR-004**: Database + multi-tenancy with PostgreSQL RLS
