-- ============================================================
-- BLACKSITE: SYSTEM32 — Level 2 — DATA WARFARE
-- Supabase Migration — Run in Supabase SQL Editor
-- ============================================================

-- ── Session tracking ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_sessions (
  team_id         TEXT PRIMARY KEY,
  started_at      TIMESTAMPTZ DEFAULT now(),
  ends_at         TIMESTAMPTZ,
  current_section TEXT DEFAULT 'A',
  is_active       BOOLEAN DEFAULT true
);

-- ── Submissions log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       TEXT NOT NULL,
  task_id       TEXT NOT NULL,
  sql_query     TEXT,
  result_json   JSONB,
  is_correct    BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  hint_used     BOOLEAN DEFAULT false,
  attempt_count INTEGER DEFAULT 1,
  submitted_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS l2_submissions_team_idx ON l2_submissions (team_id);
CREATE INDEX IF NOT EXISTS l2_submissions_task_idx ON l2_submissions (task_id);

-- ── Live scores ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_scores (
  team_id         TEXT PRIMARY KEY,
  total_points    INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  section_a_pts   INTEGER DEFAULT 0,
  section_b_pts   INTEGER DEFAULT 0,
  section_c_pts   INTEGER DEFAULT 0,
  bonus_pts       INTEGER DEFAULT 0,
  ai_penalty      INTEGER DEFAULT 0,
  last_submit_at  TIMESTAMPTZ DEFAULT now()
);

-- ── AI usage logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_ai_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id       TEXT NOT NULL,
  task_id       TEXT NOT NULL,
  prompt_used   TEXT NOT NULL,
  tool_used     TEXT NOT NULL,
  modification  TEXT NOT NULL,
  understanding TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS l2_ai_logs_team_idx ON l2_ai_logs (team_id);

-- ── Hints used log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_hints_used (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id   TEXT NOT NULL,
  task_id   TEXT NOT NULL,
  used_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Enable Realtime on scores ─────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE l2_scores;

-- ── Row Level Security (optional — enable for production) ─
-- ALTER TABLE l2_submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE l2_scores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE l2_sessions ENABLE ROW LEVEL SECURITY;

-- ── Indexes for leaderboard performance ───────────────────
CREATE INDEX IF NOT EXISTS l2_scores_pts_idx ON l2_scores (total_points DESC);
CREATE INDEX IF NOT EXISTS l2_sessions_active_idx ON l2_sessions (is_active);
