# DataLabyrinth — Pre-Launch Checklist

## Local Dev
- [x] `npm install` completed in backend and frontend
- [x] `backend/.env` and `frontend/.env.local` created from `.env.example`
- [x] Backend `GET /health` responds `{"status":"ok"}` on port 3001
- [x] Frontend Next.js dev server responds on port 3000
- [ ] **Fill in real `DATABASE_URL`** (Supabase pooler URL with `?pgbouncer=true`)
- [ ] **Fill in real `REDIS_URL`** (Upstash REST URL or self-hosted Redis)
- [ ] Run DB migration: `psql $DATABASE_URL < backend/db/migrations/001_init.sql`
- [ ] Seed test teams: `cd backend && npm run seed`
- [ ] Smoke-test login: `curl -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"access_code":"TEAM-1"}'`

## Production Deployment
- [ ] Push backend to Railway; confirm `HEALTHCHECK /health` passes
- [ ] Set all env vars in Railway (DATABASE_URL, REDIS_URL, JWT_SECRET, ADMIN_SECRET, PORT=3001)
- [ ] Push frontend to Vercel; set `NEXT_PUBLIC_API_URL` to Railway URL
- [ ] Update `frontend/vercel.json` rewrite destination to real Railway URL
- [ ] Enable Supabase connection pooling (Session mode, port 5432)
- [ ] Confirm Supabase RLS service-role bypass policies are active

## Load Testing (k6)
- [ ] Install k6: `brew install k6` / `apt install k6`
- [ ] Run: `API_URL=https://api.datalabyrinth.yourdomain.com k6 run loadtest/scenario.js`
- [ ] Validate p95 latency < 500 ms
- [ ] Validate error rate < 1%
- [ ] Confirm Redis leaderboard cache hit ratio > 50%
- [ ] Verify DB shows no connection exhaustion (Supabase dashboard)
- [ ] Export and archive k6 HTML report with timestamp
- [ ] Capture Railway logs for anomalies during peak load
- [ ] Re-run smoke tests post-load to ensure system stability

## Event Day
- [ ] Admin: open `/admin` page and enter ADMIN_SECRET
- [ ] Distribute access codes to teams
- [ ] Click **Start Game** in admin panel to set `timer:global`
- [ ] Monitor live leaderboard at `/leaderboard`
- [ ] Use **Pause / Resume** as needed during the event
- [ ] Click **End Game** when time is up
- [ ] Download CSV export for final scores
