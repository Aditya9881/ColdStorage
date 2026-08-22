# ColdStorage — Deployment Runbook & Backup Guide

## 1. Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Frontend    │────▶│  Backend     │────▶│  PostgreSQL      │
│  (Next.js)   │     │  (Express)   │     │  (via Prisma)    │
│  Vercel      │     │  Railway/EC2 │     │  Supabase/RDS    │
└──────────────┘     └──────────────┘     └──────────────────┘
                            │
                     ┌──────┴──────┐
                     │  Redis      │
                     │  (sessions) │
                     └─────────────┘
```

---

## 2. Environment Variables

### Backend (`.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/coldstorage` |
| `JWT_ACCESS_SECRET` | JWT signing key (min 32 chars) | `generate: openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `generate: openssl rand -base64 32` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | `production` / `development` | `production` |
| `REDIS_URL` | Redis connection (optional) | `redis://host:6379` |
| `SENTRY_DSN` | Sentry error monitoring DSN | `https://...@sentry.io/...` |
| `WHATSAPP_TOKEN` | Meta WhatsApp API token | — |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification | — |

### Frontend (`.env.local`)
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://api.coldstorage.in/api/v1` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend | `https://...@sentry.io/...` |
| `VERCEL_PROJECT_DOMAIN` | For CORS matching | `coldstorage.vercel.app` |

---

## 3. Deployment Steps

### 3.1 Backend Deployment

```bash
# 1. Clone & install
git clone <repo-url> && cd ColdStorage/backend
npm ci --production

# 2. Run database migrations
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Build TypeScript
npm run build

# 5. Start server
NODE_ENV=production node dist/server.js
```

**Docker option:**
```bash
docker build -t coldstorage-api -f backend/Dockerfile .
docker run -d --name cs-api \
  -e DATABASE_URL="..." \
  -e JWT_ACCESS_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  -p 4000:4000 \
  coldstorage-api
```

### 3.2 Frontend Deployment (Vercel)

```bash
# Option A: Vercel CLI
cd frontend
vercel --prod

# Option B: Git push (auto-deploy)
git push origin main
```

**Environment variables in Vercel dashboard:**
- `NEXT_PUBLIC_API_URL` → your backend URL
- `NEXT_PUBLIC_SENTRY_DSN` → Sentry DSN

### 3.3 Database Seeding (First Deploy Only)

```bash
# Create initial SUPER_ADMIN user
npx ts-node scripts/seed-admin.ts

# Or via Prisma seed
npx prisma db seed
```

---

## 4. Backup Strategy

### 4.1 Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

**Automated daily backups (cron):**
```bash
# Add to crontab -e
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/coldstorage_$(date +\%Y\%m\%d).sql.gz

# Retain last 30 days
0 3 * * * find /backups -name "coldstorage_*.sql.gz" -mtime +30 -delete
```

### 4.2 Supabase / Cloud Provider Backups
- **Supabase**: Auto-daily backups on Pro plan (7-day retention)
- **AWS RDS**: Enable automated backups (35-day retention)
- **Railway**: Daily snapshots included

### 4.3 Application Data
- **Uploaded files**: If using local storage, back up the `uploads/` directory
- **PDFs**: Generated on-demand, no backup needed
- **Redis**: Transient session data, no backup needed

---

## 5. Monitoring & Alerting

### 5.1 Health Check
```bash
# Backend health endpoint
curl https://api.coldstorage.in/api/v1/health

# Expected response:
# { "success": true, "data": { "status": "ok", "database": "connected" } }
```

### 5.2 Uptime Monitoring
- Use **UptimeRobot** or **BetterUptime** to ping `/api/v1/health` every 5 min
- Alert on: 2 consecutive failures

### 5.3 Error Monitoring
- **Sentry**: Tracks frontend + backend exceptions
- Alert threshold: > 10 errors/hour = critical

### 5.4 Log Aggregation
- Backend logs structured JSON to stdout
- Use **Railway Logs**, **CloudWatch**, or **Datadog** for aggregation
- Key log fields: `level`, `message`, `timestamp`, `userId`, `url`

---

## 6. Rollback Procedure

### 6.1 Frontend (Vercel)
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### 6.2 Backend
```bash
# Revert to previous Git commit
git revert HEAD
git push origin main

# Or re-deploy specific tag
git checkout v1.2.3
npm run build && pm2 restart coldstorage-api
```

### 6.3 Database Rollback
```bash
# Prisma migration rollback (reverts last migration)
npx prisma migrate resolve --rolled-back <migration-name>

# Manual SQL restore
psql $DATABASE_URL < backup_before_deploy.sql
```

---

## 7. SSL & Security Checklist

- [x] HTTPS enforced (middleware: `enforce-https.ts`)
- [x] CORS restricted to specific domains
- [x] CSRF protection for cookie-based auth
- [x] Helmet security headers
- [x] Rate limiting on API endpoints
- [x] Input sanitization middleware
- [x] JWT token rotation (access + refresh)
- [ ] Content Security Policy (add in production)
- [ ] Enable `optimizeCss` in Next.js config (install `critters`)

---

## 8. Scaling Considerations

| Component | Current | Recommended at Scale |
|-----------|---------|---------------------|
| Backend | Single instance | 2-3 instances behind load balancer |
| Database | Single PostgreSQL | Read replica + connection pooler (PgBouncer) |
| Sessions | In-memory | Redis cluster |
| File Storage | Local | S3 / CloudFlare R2 |
| CDN | Vercel Edge | Keep Vercel, add CloudFlare for API caching |
| IoT Ingestion | REST API | MQTT broker → message queue → worker |

---

## 9. Disaster Recovery

| Scenario | Recovery Time | Steps |
|----------|--------------|-------|
| Frontend down | < 5 min | Vercel auto-heals; rollback if code issue |
| Backend crash | < 10 min | PM2/Railway auto-restart; check logs |
| Database corruption | < 30 min | Restore from latest backup |
| Full outage | < 1 hour | Re-deploy from Git + restore DB backup |
| Data breach | Immediate | Rotate all secrets, audit logs, notify users |
