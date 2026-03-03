// server/index.js — BLACKSITE Level 2 Express backend
// Database: Railway PostgreSQL (pg)

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 4000;

/* ── PostgreSQL pool (Railway provides DATABASE_URL) ──────────── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
});
const q = (text, params) => pool.query(text, params);

/* ── Middleware ────────────────────────────────────────────────── */
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl / server-to-server), localhost on any port, and Vercel
    if (!origin) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return callback(null, true);
    if (/vercel\.app$/.test(origin)) return callback(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

/* ── Auth middleware ───────────────────────────────────────────── */
const requireAdmin = async (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // Fast path: env ADMIN_SECRET
  if (process.env.ADMIN_SECRET && token === process.env.ADMIN_SECRET) return next();
  // DB path: check admins table (token = admin password)
  try {
    const { rows } = await q('SELECT 1 FROM admins WHERE password=$1 LIMIT 1', [token]);
    if (rows.length > 0) return next();
  } catch { /* DB not ready, fall through */ }
  return res.status(401).json({ error: 'Unauthorized' });
};

/* ── Startup: create all tables + seed defaults ───────────────────── */
async function seedDefaults() {

  // ── PHASE 1: Schema creation ────────────────────────────────────────
  try {
    await q(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(()=>{});

    await q(`CREATE TABLE IF NOT EXISTS admins (
      id         SERIAL      PRIMARY KEY,
      username   TEXT        NOT NULL UNIQUE,
      password   TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await q(`CREATE TABLE IF NOT EXISTS teams (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT        NOT NULL,
      password   TEXT        NOT NULL UNIQUE,
      team_key   TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await q(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_key TEXT`).catch(()=>{});

    await q(`CREATE TABLE IF NOT EXISTS l2_sessions (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ends_at    TIMESTAMPTZ NOT NULL,
      is_active  BOOLEAN     DEFAULT TRUE,
      UNIQUE (team_id)
    )`);

    await q(`CREATE TABLE IF NOT EXISTS l2_submissions (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      task_id       TEXT        NOT NULL,
      sql_query     TEXT,
      result_json   JSONB,
      is_correct    BOOLEAN     DEFAULT FALSE,
      points_earned INTEGER     DEFAULT 0,
      hint_used     BOOLEAN     DEFAULT FALSE,
      attempt_count INTEGER     DEFAULT 1,
      submitted_at  TIMESTAMPTZ DEFAULT NOW()
    )`);

    await q(`CREATE TABLE IF NOT EXISTS l2_scores (
      team_id         UUID    PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
      total_points    INTEGER DEFAULT 0,
      tasks_completed INTEGER DEFAULT 0,
      section_a_pts   INTEGER DEFAULT 0,
      section_b_pts   INTEGER DEFAULT 0,
      section_c_pts   INTEGER DEFAULT 0,
      bonus_pts       INTEGER DEFAULT 0,
      last_submit_at  TIMESTAMPTZ
    )`);

    await q(`CREATE TABLE IF NOT EXISTS l2_ai_logs (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      task_id       TEXT        NOT NULL,
      tool_used     TEXT,
      prompt_used   TEXT,
      modification  TEXT,
      understanding TEXT,
      logged_at     TIMESTAMPTZ DEFAULT NOW()
    )`);

    await q(`CREATE TABLE IF NOT EXISTS l2_hints_used (
      team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      task_id   TEXT NOT NULL,
      used_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (team_id, task_id)
    )`);

    await q(`CREATE TABLE IF NOT EXISTS l2_bonus_state (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      released_at TIMESTAMPTZ,
      ends_at     TIMESTAMPTZ,
      CONSTRAINT single_row CHECK (id = 1)
    )`);
    await q(`INSERT INTO l2_bonus_state (id) VALUES (1) ON CONFLICT DO NOTHING`);

    await q(`CREATE TABLE IF NOT EXISTS students (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      dept TEXT NOT NULL,
      year INTEGER NOT NULL,
      cgpa NUMERIC(3,1) NOT NULL
    )`);
    await q(`CREATE TABLE IF NOT EXISTS marks (
      id         INTEGER PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject    TEXT NOT NULL,
      marks      INTEGER
    )`);
    await q(`CREATE TABLE IF NOT EXISTS attendance (
      id         INTEGER PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      subject    TEXT NOT NULL,
      attended   INTEGER NOT NULL,
      total      INTEGER NOT NULL
    )`);

    await q(`CREATE INDEX IF NOT EXISTS idx_l2_submissions_team ON l2_submissions(team_id)`).catch(()=>{});
    await q(`CREATE INDEX IF NOT EXISTS idx_l2_submissions_task ON l2_submissions(task_id)`).catch(()=>{});
    await q(`CREATE INDEX IF NOT EXISTS idx_l2_scores_points    ON l2_scores(total_points DESC)`).catch(()=>{});

    console.log('[BLACKSITE] Schema ensured.');
  } catch (e) {
    console.error('[BLACKSITE] Schema error:', e.message);
  }

  // ── PHASE 2: Admin seeding (independent — always runs) ──────────────
  try {
    // Use ADMIN_SECRET env var if provided, else default heisenberg/heisenberg
    const adminUser = process.env.ADMIN_USERNAME || 'heisenberg';
    const adminPass = process.env.ADMIN_SECRET   || 'heisenberg';
    await q(
      `INSERT INTO admins (username, password) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [adminUser, adminPass]
    );
    console.log(`[BLACKSITE] Admin credentials ensured (user: ${adminUser}).`);
  } catch (e) {
    console.error('[BLACKSITE] Admin seed error:', e.message);
  }

  // ── PHASE 3: Game dataset seeding ───────────────────────────────────
  try {
    const { rows: sc } = await q(`SELECT COUNT(*) FROM students`);
    if (parseInt(sc[0].count) === 0) {
      const students = require('./mockData/students.json');
      for (const s of students) {
        await q(`INSERT INTO students(id,name,dept,year,cgpa) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [s.id, s.name, s.dept, s.year, s.cgpa]);
      }
      const marks = require('./mockData/marks.json');
      for (const m of marks) {
        await q(`INSERT INTO marks(id,student_id,subject,marks) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [m.id, m.student_id, m.subject, m.marks]);
      }
      const attendance = require('./mockData/attendance.json');
      for (const a of attendance) {
        await q(`INSERT INTO attendance(id,student_id,subject,attended,total) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [a.id, a.student_id, a.subject, a.attended, a.total]);
      }
      console.log('[BLACKSITE] Game dataset seeded.');
    }
  } catch (e) {
    console.error('[BLACKSITE] Game data seed error:', e.message);
  }

  // ── PHASE 4: Competition teams seeding ──────────────────────────────
  try {
    const oldCodes = [
      'ALPHA-1','BETA-2','GAMMA-3','DELTA-4','EPSILON-5','ZETA-6','ETA-7',
      'THETA-8','IOTA-9','KAPPA-10','LAMBDA-11','MU-12','NU-13','XI-14',
      'OMICRON-15','PI-16','RHO-17','SIGMA-18','TAU-19','UPSILON-20','PHI-21','GOVINDA'
    ];
    await q(`DELETE FROM teams WHERE password = ANY($1)`, [oldCodes]).catch(()=>{});

    const teams = [
      ['CIPHER-SYNDICATE',    'Cipher26'],
      ['SANTHOSH.V',          'AI&DS 007'],
      ['RUNTIME_RUBBLES',     'Saha@100807'],
      ['BYTE-BIGILS',         'byte(2026@bigils)'],
      ['BASS-TECHIES',        'bass-atti-67'],
      ['HASHIRA-TECH',        'VADH1792'],
      ['OG-CODERS',           'barani008'],
      ['THE-VISIONARIES',     'ramgowthamp2007'],
      ['QUANTUM-CODERS',      'SIMATS26'],
      ['TEAM-NOVA-',          'teamnovaXtechtitans'],
      ['OMEGA',               'stjosephs'],
      ['MANJA-PAI',           '100000'],
      ['JUSTICE-SOCIETY',     'girihajaharijesh'],
      ['SV2-XTREME',          'SV2SV2@'],
      ['SHADOW-HACKERS',      'Karthika*14122006'],
      ['KERNAL-KING',         'karthika*100724'],
      ['AUTOMINDS',           'Automation'],
      ['AI-TRINITY',          'Ai@2005'],
      ['EVENT-VAROM-GUYS',    '123ABC'],
      ['QUADVERTEX',          'ktpv*2027'],
      ['HACK4',               '@Hack4'],
      ['TECH-BYTE',           'LISD067'],
      ['SHECODES',            'Shecodes2468'],
      ['COREVA',              'Coreva2468'],
      ['CODE-RUSH',           'coderushers'],
      ['TECH-WIZARD',         'Techwizard2468'],
      ['AVENGERS_',           'Avengers1234'],
      ['TEAM-ALOK-',          'Tharun@8392'],
      ['TEAM-TITANS-',        '8019253'],
      ['NEURO-TECH',          '25102007'],
      ['POWER-HOUSE',         'SPIHER-2006'],
      ['ADENGAPPA-4-PERU',    '90709'],
      ['THE-RED-CHIP',        'pEFR9BrW8wvu2rE'],
      ['BOLLA-DEEPAK',        '806'],
      ['NEXUS-AI',            'nexus@2026'],
      ['HACKOHOLICSS',        'vasanth.s17'],
      ['404-NOT-FOUND',       'legenddharani'],
      ['GENERATIVE-AI',       'kaavi@2008'],
      ['NAANGA-NAALU-PERU',   'Kalai@2007'],
      ['ALTIORAX',            'PMRR_02'],
      ['ZORVEX',              'thanu@03'],
      ['ELITE-CODERS',        'elite@2026'],
      ['ZYNTRIX',             'zyn@1234'],
      ['TECH-TITANS',         '809848'],
    ];
    for (const [name, code] of teams) {
      await q(
        `INSERT INTO teams (name,password) VALUES ($1,$2) ON CONFLICT (password) DO NOTHING`,
        [name, code]
      );
    }
    console.log('[BLACKSITE] Competition teams seeded.');
  } catch (e) {
    console.error('[BLACKSITE] Teams seed error:', e.message);
  }

  console.log('[BLACKSITE] DB startup complete.');
}
seedDefaults();

const validateSession = async (req, res, next) => {
  const { team_id } = req.body;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await q(
      `SELECT ends_at, is_active FROM l2_sessions WHERE team_id=$1 LIMIT 1`,
      [team_id]
    );
    const session = rows[0];
    if (!session || !session.is_active)
      return res.status(403).json({ error: 'No active session found.' });
    if (new Date(session.ends_at) < new Date())
      return res.status(403).json({ error: 'Session expired.' });
    req.sessionData = session;
    next();
  } catch (err) {
    console.error('validateSession error:', err);
    res.status(500).json({ error: 'DB error' });
  }
};

/* ════════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════════ */

/* POST /api/level2/auth — team login (team_id/name only — no password required) */
app.post('/api/level2/auth', async (req, res) => {
  const rawId = (req.body.team_id || req.body.name || '').trim();
  if (!rawId) return res.status(400).json({ error: 'Team ID required.' });
  try {
    // Match by team_key (Excel team_id) OR by team name — case-insensitive
    const { rows: teams } = await q(
      `SELECT id, name FROM teams
       WHERE LOWER(COALESCE(team_key,''))=LOWER($1) OR LOWER(name)=LOWER($1)
       LIMIT 1`,
      [rawId]
    );
    if (!teams.length) return res.status(401).json({ error: 'Team not found. Check your Team ID.' });
    const { id: team_id, name: team_name } = teams[0];

    const { rows: sessions } = await q(
      `SELECT ends_at, is_active FROM l2_sessions WHERE team_id=$1 LIMIT 1`, [team_id]
    );
    const existing = sessions[0];
    if (existing) {
      if (!existing.is_active || new Date(existing.ends_at) < new Date())
        return res.status(403).json({ error: 'Session expired or closed. Contact admin.' });
      return res.json({ ok:true, team_id, team_name, ends_at:existing.ends_at, resumed:true });
    }

    const ends_at = new Date(Date.now() + 2.5*60*60*1000).toISOString();
    await q(
      `INSERT INTO l2_sessions (team_id,ends_at,is_active,started_at) VALUES($1,$2,true,NOW())`,
      [team_id, ends_at]
    );
    await q(
      `INSERT INTO l2_scores(team_id,total_points,tasks_completed,section_a_pts,section_b_pts,section_c_pts,bonus_pts)
       VALUES($1,0,0,0,0,0,0) ON CONFLICT(team_id) DO NOTHING`,
      [team_id]
    );
    res.json({ ok:true, team_id, team_name, ends_at, resumed:false });
  } catch (err) {
    console.error('/auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* GET /api/level2/session-check?team_id=xxx */
app.get('/api/level2/session-check', async (req, res) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await q(
      `SELECT s.ends_at,s.is_active,t.name as team_name
       FROM l2_sessions s JOIN teams t ON t.id=s.team_id
       WHERE s.team_id=$1 LIMIT 1`,
      [team_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No session' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* ════════════════════════════════════════════════════════════════
   GAME ROUTES
════════════════════════════════════════════════════════════════ */

/* POST /api/level2/submit */
app.post('/api/level2/submit', validateSession, async (req, res) => {
  const { team_id, task_id, sql_query, result_json,
          is_correct, points_earned, hint_used, attempt_count } = req.body;
  try {
    // Check if team already earned points for this task (prevent double-counting).
    // Award points on the FIRST submission where points_earned > 0 (full or partial).
    const { rows: prior } = await q(
      `SELECT 1 FROM l2_submissions WHERE team_id=$1 AND task_id=$2 AND points_earned>0 LIMIT 1`,
      [team_id, task_id]
    );
    const firstTimeEarning = prior.length === 0;

    await q(
      `INSERT INTO l2_submissions
         (team_id,task_id,sql_query,result_json,is_correct,points_earned,hint_used,attempt_count,submitted_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [team_id,task_id,sql_query,JSON.stringify(result_json||{}),
       !!is_correct, points_earned||0, !!hint_used, attempt_count||1]
    );
    if ((points_earned||0) > 0 && firstTimeEarning) {
      const col = task_id.startsWith('A')?'section_a_pts':
                  task_id.startsWith('B')?'section_b_pts':
                  task_id.startsWith('C')?'section_c_pts':'bonus_pts';
      await q(
        `INSERT INTO l2_scores(team_id,total_points,tasks_completed,${col},last_submit_at)
         VALUES($1,$2,$3,$4,NOW())
         ON CONFLICT(team_id) DO UPDATE SET
           total_points    = l2_scores.total_points   + $2,
           tasks_completed = l2_scores.tasks_completed + $3,
           ${col}          = l2_scores.${col}          + $4,
           last_submit_at  = NOW()`,
        [team_id, points_earned, is_correct?1:0, points_earned]
      );
    }
    res.json({ ok:true });
  } catch (err) {
    console.error('/submit error:', err);
    res.status(500).json({ error:'Internal server error' });
  }
});

/* GET /api/level2/leaderboard */
app.get('/api/level2/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||20, 50);
  try {
    const { rows } = await q(
      `SELECT s.team_id, t.name as team_name,
              s.total_points, s.tasks_completed,
              s.section_a_pts, s.section_b_pts, s.section_c_pts, s.bonus_pts,
              s.last_submit_at
       FROM l2_scores s JOIN teams t ON t.id=s.team_id
       ORDER BY s.total_points DESC, s.last_submit_at ASC LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('/leaderboard error:', err);
    res.status(500).json({ error:'DB error' });
  }
});

/* POST /api/level2/hint */
app.post('/api/level2/hint', validateSession, async (req, res) => {
  const { team_id, task_id } = req.body;
  try {
    await q(
      `INSERT INTO l2_hints_used(team_id,task_id,used_at) VALUES($1,$2,NOW()) ON CONFLICT DO NOTHING`,
      [team_id,task_id]
    );
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'Failed to log hint' }); }
});

/* POST /api/level2/ailog */
app.post('/api/level2/ailog', async (req, res) => {
  const { team_id, task_id, toolUsed, promptUsed, modification, understanding } = req.body;
  try {
    await q(
      `INSERT INTO l2_ai_logs(team_id,task_id,tool_used,prompt_used,modification,understanding,logged_at)
       VALUES($1,$2,$3,$4,$5,$6,NOW())`,
      [team_id,task_id,toolUsed,promptUsed,modification,understanding]
    );
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'Failed to save AI log' }); }
});

/* GET /api/level2/bonus/status */
app.get('/api/level2/bonus/status', async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT released_at, ends_at FROM l2_bonus_state WHERE id=1 LIMIT 1`
    );
    res.json(rows[0]||{ released_at:null, ends_at:null });
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* POST /api/level2/bonus/release (admin) */
app.post('/api/level2/bonus/release', requireAdmin, async (req, res) => {
  try {
    const released_at = new Date().toISOString();
    const ends_at = new Date(Date.now()+15*60*1000).toISOString();
    await q(
      `INSERT INTO l2_bonus_state(id,released_at,ends_at)
       VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET released_at=$1,ends_at=$2`,
      [released_at,ends_at]
    );
    res.json({ ok:true, released_at, ends_at });
  } catch (err) {
    console.error('/bonus/release error:', err);
    res.status(500).json({ error:'Failed to release bonus' });
  }
});

/* ════════════════════════════════════════════════════════════════
   ADMIN ROUTES
════════════════════════════════════════════════════════════════ */

/* GET  /api/admin/teams */
app.get('/api/admin/teams', requireAdmin, async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT t.id, t.name, t.password AS code, t.team_key,
              s.is_active, s.ends_at, s.started_at,
              COALESCE(sc.total_points,0) as total_points,
              COALESCE(sc.tasks_completed,0) as tasks_completed
       FROM teams t
       LEFT JOIN l2_sessions s  ON s.team_id=t.id
       LEFT JOIN l2_scores   sc ON sc.team_id=t.id
       ORDER BY t.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* POST /api/admin/teams — create team */
app.post('/api/admin/teams', requireAdmin, async (req, res) => {
  const { name, code } = req.body;
  if (!name||!code) return res.status(400).json({ error:'name and code required' });
  try {
    const { rows } = await q(
      `INSERT INTO teams(id,name,password) VALUES($1,$2,UPPER($3)) RETURNING *`,
      [uuidv4(),name,code]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code==='23505') return res.status(409).json({ error:'Code already exists' });
    res.status(500).json({ error:'DB error' });
  }
});

/* POST /api/admin/teams/import — bulk import teams from Excel data */
app.post('/api/admin/teams/import', requireAdmin, async (req, res) => {
  const { teams } = req.body;
  if (!Array.isArray(teams) || teams.length === 0)
    return res.status(400).json({ error: 'teams array required' });

  let inserted = 0, updated = 0, skipped = 0;
  const errors = [];

  for (const t of teams) {
    const teamKey  = String(t.team_id   || '').trim();
    const teamName = String(t.team_name || '').trim();
    const password = String(t.password  || '').trim();

    if (!teamName) { skipped++; continue; }

    try {
      // Try to find existing team by name (case-insensitive)
      const { rows: existing } = await q(
        `SELECT id FROM teams WHERE LOWER(name)=LOWER($1) LIMIT 1`,
        [teamName]
      );
      if (existing.length > 0) {
        // Update team_key (and password if provided) for existing team
        if (password) {
          await q(
            `UPDATE teams SET team_key=NULLIF($1,''), password=$3 WHERE id=$2`,
            [teamKey, existing[0].id, password]
          );
        } else {
          await q(
            `UPDATE teams SET team_key=NULLIF($1,'') WHERE id=$2`,
            [teamKey, existing[0].id]
          );
        }
        updated++;
      } else {
        // Insert new team — auto-generate password if not provided
        const pass = password || uuidv4();
        await q(
          `INSERT INTO teams(id, team_key, name, password)
           VALUES($1, NULLIF($2,''), $3, $4)`,
          [uuidv4(), teamKey, teamName, pass]
        );
        inserted++;
      }
    } catch (err) {
      skipped++;
      errors.push(`${teamName}: ${err.message}`);
    }
  }
  res.json({ ok: true, inserted, updated, skipped, errors: errors.slice(0, 10) });
});

/* DELETE /api/admin/teams/:id */
app.delete('/api/admin/teams/:id', requireAdmin, async (req, res) => {
  try {
    await q(`DELETE FROM teams WHERE id=$1`, [req.params.id]);
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* POST /api/admin/reseed-teams — force re-insert all real competition teams */
app.post('/api/admin/reseed-teams', requireAdmin, async (req, res) => {
  const oldCodes = [
    'ALPHA-1','BETA-2','GAMMA-3','DELTA-4','EPSILON-5','ZETA-6','ETA-7',
    'THETA-8','IOTA-9','KAPPA-10','LAMBDA-11','MU-12','NU-13','XI-14',
    'OMICRON-15','PI-16','RHO-17','SIGMA-18','TAU-19','UPSILON-20','PHI-21','GOVINDA'
  ];
  const teams = [
    ['CIPHER-SYNDICATE',    'Cipher26'],
    ['SANTHOSH.V',          'AI&DS 007'],
    ['RUNTIME_RUBBLES',     'Saha@100807'],
    ['BYTE-BIGILS',         'byte(2026@bigils)'],
    ['BASS-TECHIES',        'bass-atti-67'],
    ['HASHIRA-TECH',        'VADH1792'],
    ['OG-CODERS',           'barani008'],
    ['THE-VISIONARIES',     'ramgowthamp2007'],
    ['QUANTUM-CODERS',      'SIMATS26'],
    ['TEAM-NOVA-',          'teamnovaXtechtitans'],
    ['OMEGA',               'stjosephs'],
    ['MANJA-PAI',           '100000'],
    ['JUSTICE-SOCIETY',     'girihajaharijesh'],
    ['SV2-XTREME',          'SV2SV2@'],
    ['SHADOW-HACKERS',      'Karthika*14122006'],
    ['KERNAL-KING',         'karthika*100724'],
    ['AUTOMINDS',           'Automation'],
    ['AI-TRINITY',          'Ai@2005'],
    ['EVENT-VAROM-GUYS',    '123ABC'],
    ['QUADVERTEX',          'ktpv*2027'],
    ['HACK4',               '@Hack4'],
    ['TECH-BYTE',           'LISD067'],
    ['SHECODES',            'Shecodes2468'],
    ['COREVA',              'Coreva2468'],
    ['CODE-RUSH',           'coderushers'],
    ['TECH-WIZARD',         'Techwizard2468'],
    ['AVENGERS_',           'Avengers1234'],
    ['TEAM-ALOK-',          'Tharun@8392'],
    ['TEAM-TITANS-',        '8019253'],
    ['NEURO-TECH',          '25102007'],
    ['POWER-HOUSE',         'SPIHER-2006'],
    ['ADENGAPPA-4-PERU',    '90709'],
    ['THE-RED-CHIP',        'pEFR9BrW8wvu2rE'],
    ['BOLLA-DEEPAK',        '806'],
    ['NEXUS-AI',            'nexus@2026'],
    ['HACKOHOLICSS',        'vasanth.s17'],
    ['404-NOT-FOUND',       'legenddharani'],
    ['GENERATIVE-AI',       'kaavi@2008'],
    ['NAANGA-NAALU-PERU',   'Kalai@2007'],
    ['ALTIORAX',            'PMRR_02'],
    ['ZORVEX',              'thanu@03'],
    ['ELITE-CODERS',        'elite@2026'],
    ['ZYNTRIX',             'zyn@1234'],
    ['TECH-TITANS',         '809848'],
  ];
  try {
    await q(`DELETE FROM teams WHERE password = ANY($1)`, [oldCodes]).catch(()=>{});
    let inserted = 0;
    for (const [name, code] of teams) {
      const r = await q(
        `INSERT INTO teams (name,password) VALUES ($1,$2) ON CONFLICT (password) DO NOTHING`,
        [name, code]
      );
      inserted += r.rowCount;
    }
    const { rows } = await q(`SELECT name, password FROM teams ORDER BY name`);
    res.json({ ok: true, inserted, total: rows.length, teams: rows });
  } catch (err) {
    console.error('/reseed-teams error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* GET /api/admin/scores */
app.get('/api/admin/scores', requireAdmin, async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT sc.*, t.name as team_name FROM l2_scores sc
       JOIN teams t ON t.id=sc.team_id ORDER BY sc.total_points DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* POST /api/admin/deduct */
app.post('/api/admin/deduct', requireAdmin, async (req, res) => {
  const { team_id, points, reason } = req.body;
  if (!team_id||!points) return res.status(400).json({ error:'team_id and points required' });
  try {
    await q(
      `UPDATE l2_scores SET total_points=GREATEST(0,total_points-$2),last_submit_at=NOW()
       WHERE team_id=$1`,
      [team_id,parseInt(points)]
    );
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* PATCH /api/admin/sessions/:team_id/deactivate */
app.patch('/api/admin/sessions/:team_id/deactivate', requireAdmin, async (req, res) => {
  try {
    await q(`UPDATE l2_sessions SET is_active=false WHERE team_id=$1`,[req.params.team_id]);
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* GET /api/admin/submissions?team_id=xxx */
app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  const { team_id } = req.query;
  try {
    const { rows } = team_id
      ? await q(
          `SELECT sub.*,t.name as team_name FROM l2_submissions sub
           JOIN teams t ON t.id=sub.team_id WHERE sub.team_id=$1
           ORDER BY sub.submitted_at DESC LIMIT 100`,
          [team_id]
        )
      : await q(
          `SELECT sub.*,t.name as team_name FROM l2_submissions sub
           JOIN teams t ON t.id=sub.team_id ORDER BY sub.submitted_at DESC LIMIT 200`
        );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* GET /api/admin/export.csv */
app.get('/api/admin/export.csv', requireAdmin, async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT t.name as team_name,t.password,
              sc.total_points,sc.tasks_completed,
              sc.section_a_pts,sc.section_b_pts,sc.section_c_pts,sc.bonus_pts,
              sc.last_submit_at
       FROM l2_scores sc JOIN teams t ON t.id=sc.team_id
       ORDER BY sc.total_points DESC`
    );
    const header='Team,Password,Total,Tasks,SectionA,SectionB,SectionC,Bonus,LastSubmit\n';
    const csv=header+rows.map(r=>
      `"${r.team_name}",${r.password},${r.total_points},${r.tasks_completed},`+
      `${r.section_a_pts},${r.section_b_pts},${r.section_c_pts},${r.bonus_pts},`+
      `"${r.last_submit_at||''}"`
    ).join('\n');
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="level2-scores.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error:'DB error' }); }
});

/* ── Mock data ────────────────────────────────────────────────── */
app.get('/api/level2/mock/students',   (_,res)=>res.json(require('./mockData/students.json')));
app.get('/api/level2/mock/marks',      (_,res)=>res.json(require('./mockData/marks.json')));
app.get('/api/level2/mock/attendance', (_,res)=>res.json(require('./mockData/attendance.json')));

/* POST /api/level2/query — safe SELECT-only SQL runner */
const BLOCKED_SQL_KEYWORDS = ['drop','delete','insert','update','create','alter','attach','detach','replace','truncate','pragma','vacuum','copy','grant','revoke'];
const BLOCKED_TABLES = ['teams','admins','l2_sessions','l2_submissions','l2_scores','l2_ai_logs','l2_hints_used','l2_bonus_state'];

app.post('/api/level2/query', async (req, res) => {
  const { sql: sqlQuery } = req.body || {};
  if (!sqlQuery || typeof sqlQuery !== 'string') return res.status(400).json({ error: 'sql required' });
  const trimmed = sqlQuery.trim();
  const lower = trimmed.toLowerCase();
  // Must be SELECT
  if (!lower.startsWith('select')) return res.status(400).json({ error: '⛔ Only SELECT queries are allowed.' });
  // Block dangerous keywords
  for (const kw of BLOCKED_SQL_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(lower))
      return res.status(400).json({ error: `⛔ Keyword '${kw.toUpperCase()}' is not allowed.` });
  }
  // Block access to non-game tables
  for (const tbl of BLOCKED_TABLES) {
    if (new RegExp(`\\b${tbl}\\b`).test(lower))
      return res.status(403).json({ error: `⛔ Table '${tbl}' is not accessible.` });
  }
  try {
    const result = await pool.query(trimmed);
    const columns = result.fields.map(f => f.name);
    const data = result.rows.map(r => columns.map(c => r[c] ?? null));
    res.json({ columns, rows: data });
  } catch (err) {
    res.json({ error: `SQL Error: ${err.message}` });
  }
});

/* ── Admin Login (DB-backed + ADMIN_SECRET fallback) ─────────────── */
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  // Fast path: ADMIN_SECRET env var (any username accepted with the secret)
  if (process.env.ADMIN_SECRET && password === process.env.ADMIN_SECRET)
    return res.json({ ok: true, token: password });

  try {
    const { rows } = await q(
      'SELECT id FROM admins WHERE username=$1 AND password=$2 LIMIT 1',
      [username, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });
    // The password itself is the API bearer token for subsequent admin calls
    res.json({ ok: true, token: password });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Admin Credentials list (for panel display) ─────────────────── */
app.get('/api/admin/credentials', requireAdmin, async (req, res) => {
  try {
    const [adminsRes, teamsRes] = await Promise.all([
      q('SELECT username, password FROM admins ORDER BY created_at'),
      q('SELECT name, COALESCE(team_key, password) AS code, team_key, password FROM teams ORDER BY name'),
    ]);
    res.json({ admins: adminsRes.rows, teams: teamsRes.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Debrief ───────────────────────────────────────────────────── */
app.get('/api/level2/debrief/:team_id', async (req, res) => {
  const { team_id } = req.params;
  try {
    const [scoreRes, subsRes, aiRes, rankRes] = await Promise.all([
      q(`SELECT * FROM l2_scores WHERE team_id=$1`, [team_id]),
      q(`SELECT task_id,sql_query,is_correct,points_earned,hint_used,attempt_count,submitted_at
         FROM l2_submissions WHERE team_id=$1 ORDER BY submitted_at`, [team_id]),
      q(`SELECT task_id,tool_used,prompt_used FROM l2_ai_logs WHERE team_id=$1`, [team_id]),
      q(`SELECT team_id FROM l2_scores ORDER BY total_points DESC`),
    ]);
    const allTeams = rankRes.rows;
    const rank = allTeams.findIndex(t => t.team_id === team_id) + 1;
    res.json({
      score: scoreRes.rows[0] || null,
      submissions: subsRes.rows,
      ai_logs: aiRes.rows,
      rank,
      total_teams: allTeams.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Health ────────────────────────────────────────────────────── */
app.get('/health', async (_,res) => {
  try {
    await q('SELECT 1');
    res.json({ status:'ok', db:'connected', ts:new Date().toISOString() });
  } catch { res.status(503).json({ status:'error', db:'unreachable' }); }
});

/* ── Diagnostics — lists which tables exist & row counts ────────── */
app.get('/diag', async (_,res) => {
  const tables = ['admins','teams','l2_sessions','l2_submissions','l2_scores','l2_ai_logs','l2_hints_used','l2_bonus_state'];
  const results = {};
  for (const t of tables) {
    try {
      const r = await q(`SELECT COUNT(*) FROM ${t}`);
      results[t] = `ok (${r.rows[0].count} rows)`;
    } catch (e) {
      results[t] = `ERROR: ${e.message}`;
    }
  }
  // Also test a simple team auth query
  try {
    const r = await q(`SELECT id,name FROM teams WHERE UPPER(password)=$1 LIMIT 1`,['GOVINDA']);
    results['_auth_query'] = r.rows.length ? `ok — found: ${r.rows[0].name}` : 'no row found for GOVINDA';
  } catch(e) { results['_auth_query'] = `ERROR: ${e.message}`; }
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`[BLACKSITE] Level 2 backend listening on port ${PORT}`);
});
