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
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});
const q = (text, params) => pool.query(text, params);

/* ── Middleware ────────────────────────────────────────────────── */
app.use(cors({
  origin: [
    'http://localhost:3000',
    /vercel\.app$/,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
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
  try {
    // Enable UUID extension (needed on some PG versions)
    await q(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).catch(()=>{});

    // ── admins ──────────────────────────────────────────────────────
    await q(`CREATE TABLE IF NOT EXISTS admins (
      id         SERIAL      PRIMARY KEY,
      username   TEXT        NOT NULL UNIQUE,
      password   TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── teams ───────────────────────────────────────────────────────
    await q(`CREATE TABLE IF NOT EXISTS teams (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT        NOT NULL,
      code       TEXT        NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── sessions ────────────────────────────────────────────────────
    await q(`CREATE TABLE IF NOT EXISTS l2_sessions (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      ends_at    TIMESTAMPTZ NOT NULL,
      is_active  BOOLEAN     DEFAULT TRUE,
      UNIQUE (team_id)
    )`);

    // ── submissions ─────────────────────────────────────────────────
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

    // ── scores ──────────────────────────────────────────────────────
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

    // ── ai logs ─────────────────────────────────────────────────────
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

    // ── hints ────────────────────────────────────────────────────────
    await q(`CREATE TABLE IF NOT EXISTS l2_hints_used (
      team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      task_id   TEXT NOT NULL,
      used_at   TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (team_id, task_id)
    )`);

    // ── bonus state ──────────────────────────────────────────────────
    await q(`CREATE TABLE IF NOT EXISTS l2_bonus_state (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      released_at TIMESTAMPTZ,
      ends_at     TIMESTAMPTZ,
      CONSTRAINT single_row CHECK (id = 1)
    )`);
    await q(`INSERT INTO l2_bonus_state (id) VALUES (1) ON CONFLICT DO NOTHING`);

    // ── indexes ──────────────────────────────────────────────────────
    await q(`CREATE INDEX IF NOT EXISTS idx_l2_submissions_team ON l2_submissions(team_id)`).catch(()=>{});
    await q(`CREATE INDEX IF NOT EXISTS idx_l2_submissions_task ON l2_submissions(task_id)`).catch(()=>{});
    await q(`CREATE INDEX IF NOT EXISTS idx_l2_scores_points    ON l2_scores(total_points DESC)`).catch(()=>{});

    // ── default credentials ──────────────────────────────────────────
    await q(`INSERT INTO admins (username, password) VALUES ('heisenberg','heisenberg')
             ON CONFLICT (username) DO NOTHING`);

    // ── 21 competition teams ─────────────────────────────────────────
    const teams = [
      ['Alpha Squad',    'ALPHA-1'],
      ['Beta Force',     'BETA-2'],
      ['Gamma Unit',     'GAMMA-3'],
      ['Delta Ops',      'DELTA-4'],
      ['Epsilon Core',   'EPSILON-5'],
      ['Zeta Strike',    'ZETA-6'],
      ['Eta Recon',      'ETA-7'],
      ['Theta Command',  'THETA-8'],
      ['Iota Division',  'IOTA-9'],
      ['Kappa Team',     'KAPPA-10'],
      ['Lambda Squad',   'LAMBDA-11'],
      ['Mu Force',       'MU-12'],
      ['Nu Ops',         'NU-13'],
      ['Xi Recon',       'XI-14'],
      ['Omicron Unit',   'OMICRON-15'],
      ['Pi Strike',      'PI-16'],
      ['Rho Division',   'RHO-17'],
      ['Sigma Core',     'SIGMA-18'],
      ['Tau Command',    'TAU-19'],
      ['Upsilon Team',   'UPSILON-20'],
      ['Phi Recon',      'PHI-21'],
      ['Battery',        'GOVINDA'],   // default test team
    ];
    for (const [name, code] of teams) {
      await q(`INSERT INTO teams (name,code) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING`, [name, code]);
    }

    console.log('[BLACKSITE] DB schema ensured + defaults seeded.');
  } catch (e) {
    console.error('[BLACKSITE] seedDefaults ERROR:', e.message);
  }
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

/* POST /api/level2/auth — team login (name + code, or code only) */
app.post('/api/level2/auth', async (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  const name = (req.body.name || '').trim();
  if (!code) return res.status(400).json({ error: 'Password (access code) required.' });
  try {
    // If username provided, match both name + code; else fall back to code-only
    const query = name
      ? `SELECT id, name FROM teams WHERE UPPER(code)=$1 AND LOWER(name)=LOWER($2) LIMIT 1`
      : `SELECT id, name FROM teams WHERE UPPER(code)=$1 LIMIT 1`;
    const params = name ? [code, name] : [code];
    const { rows: teams } = await q(query, params);
    if (!teams.length) return res.status(401).json({ error: 'Invalid username or password.' });
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
    res.status(500).json({ error: 'Internal server error', detail: err.message });
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
    await q(
      `INSERT INTO l2_submissions
         (team_id,task_id,sql_query,result_json,is_correct,points_earned,hint_used,attempt_count,submitted_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [team_id,task_id,sql_query,JSON.stringify(result_json||{}),
       !!is_correct, points_earned||0, !!hint_used, attempt_count||1]
    );
    if ((points_earned||0) > 0) {
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
app.post('/api/level2/ailog', validateSession, async (req, res) => {
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
      `SELECT t.id, t.name, t.code,
              s.is_active, s.ends_at, s.started_at,
              COALESCE(sc.total_points,0) as total_points,
              COALESCE(sc.tasks_completed,0) as tasks_completed
       FROM teams t
       LEFT JOIN l2_sessions s  ON s.team_id=t.id
       LEFT JOIN l2_scores   sc ON sc.team_id=t.id
       ORDER BY t.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error:'DB error', detail: err.message }); }
});

/* POST /api/admin/teams — create team */
app.post('/api/admin/teams', requireAdmin, async (req, res) => {
  const { name, code } = req.body;
  if (!name||!code) return res.status(400).json({ error:'name and code required' });
  try {
    const { rows } = await q(
      `INSERT INTO teams(id,name,code) VALUES($1,$2,UPPER($3)) RETURNING *`,
      [uuidv4(),name,code]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code==='23505') return res.status(409).json({ error:'Code already exists' });
    res.status(500).json({ error:'DB error' });
  }
});

/* DELETE /api/admin/teams/:id */
app.delete('/api/admin/teams/:id', requireAdmin, async (req, res) => {
  try {
    await q(`DELETE FROM teams WHERE id=$1`, [req.params.id]);
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:'DB error' }); }
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
      `SELECT t.name as team_name,t.code,
              sc.total_points,sc.tasks_completed,
              sc.section_a_pts,sc.section_b_pts,sc.section_c_pts,sc.bonus_pts,
              sc.last_submit_at
       FROM l2_scores sc JOIN teams t ON t.id=sc.team_id
       ORDER BY sc.total_points DESC`
    );
    const header='Team,Code,Total,Tasks,SectionA,SectionB,SectionC,Bonus,LastSubmit\n';
    const csv=header+rows.map(r=>
      `"${r.team_name}",${r.code},${r.total_points},${r.tasks_completed},`+
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

/* ── Admin Login (DB-backed) ────────────────────────────────────── */
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
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
      q('SELECT name, code FROM teams ORDER BY name'),
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
    const r = await q(`SELECT id,name FROM teams WHERE UPPER(code)=$1 LIMIT 1`,['GOVINDA']);
    results['_auth_query'] = r.rows.length ? `ok — found: ${r.rows[0].name}` : 'no row found for GOVINDA';
  } catch(e) { results['_auth_query'] = `ERROR: ${e.message}`; }
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`[BLACKSITE] Level 2 backend listening on port ${PORT}`);
});
