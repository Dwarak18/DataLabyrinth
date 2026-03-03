-- ============================================================
-- BLACKSITE: SYSTEM32 — Level 2 DATA WARFARE
-- Railway PostgreSQL Schema
--
-- Run this in Railway's "Query" tab on your Postgres plugin.
-- ============================================================

-- ── Admin accounts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         SERIAL      PRIMARY KEY,
  username   TEXT        NOT NULL UNIQUE,
  password   TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Teams (login credentials) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  password   TEXT        NOT NULL UNIQUE,   -- login password, always UPPERCASE
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Game sessions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at    TIMESTAMPTZ NOT NULL,
  is_active  BOOLEAN     DEFAULT TRUE,
  UNIQUE (team_id)
);

-- ── Per-task submissions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_submissions (
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
);

-- ── Live scoreboard ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_scores (
  team_id         UUID    PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  total_points    INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  section_a_pts   INTEGER DEFAULT 0,
  section_b_pts   INTEGER DEFAULT 0,
  section_c_pts   INTEGER DEFAULT 0,
  bonus_pts       INTEGER DEFAULT 0,
  last_submit_at  TIMESTAMPTZ
);

-- ── AI-log tracking ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_ai_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  task_id       TEXT        NOT NULL,
  tool_used     TEXT,
  prompt_used   TEXT,
  modification  TEXT,
  understanding TEXT,
  logged_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Hint usage ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS l2_hints_used (
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  task_id   TEXT NOT NULL,
  used_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, task_id)
);

-- ── Bonus-round state (single row) ──────────────────────────────
CREATE TABLE IF NOT EXISTS l2_bonus_state (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  released_at TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO l2_bonus_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── Performance indexes ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_l2_submissions_team ON l2_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_l2_submissions_task ON l2_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_l2_scores_points    ON l2_scores(total_points DESC);

-- ── Admin seed ──────────────────────────────────────────────────────
INSERT INTO admins (username, password)
VALUES ('heisenberg', 'heisenberg')
ON CONFLICT (username) DO NOTHING;

