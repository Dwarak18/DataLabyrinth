-- ============================================================
-- BLACKSITE — Seed default teams
-- Run this in Railway's Postgres "Query" tab if teams are missing
-- ============================================================

INSERT INTO admins (username, password)
VALUES ('heisenberg', 'heisenberg')
ON CONFLICT (username) DO NOTHING;

INSERT INTO teams (name, code) VALUES
  ('Alpha Squad',   'ALPHA-1'),
  ('Beta Force',    'BETA-2'),
  ('Gamma Unit',    'GAMMA-3'),
  ('Delta Ops',     'DELTA-4'),
  ('Epsilon Core',  'EPSILON-5'),
  ('Zeta Strike',   'ZETA-6'),
  ('Eta Recon',     'ETA-7'),
  ('Theta Command', 'THETA-8'),
  ('Iota Division', 'IOTA-9'),
  ('Kappa Team',    'KAPPA-10'),
  ('Lambda Squad',  'LAMBDA-11'),
  ('Mu Force',      'MU-12'),
  ('Nu Ops',        'NU-13'),
  ('Xi Recon',      'XI-14'),
  ('Omicron Unit',  'OMICRON-15'),
  ('Pi Strike',     'PI-16'),
  ('Rho Division',  'RHO-17'),
  ('Sigma Core',    'SIGMA-18'),
  ('Tau Command',   'TAU-19'),
  ('Upsilon Team',  'UPSILON-20'),
  ('Phi Recon',     'PHI-21'),
  ('Battery',       'GOVINDA')
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT name, code FROM teams ORDER BY name;
