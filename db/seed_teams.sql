-- ============================================================
-- BLACKSITE — Seed real competition teams from TEAMS-DATA.xlsx
-- Run this in Railway's Postgres "Query" tab
-- ============================================================

-- Remove old placeholder teams
DELETE FROM teams WHERE code IN (
  'ALPHA-1','BETA-2','GAMMA-3','DELTA-4','EPSILON-5','ZETA-6','ETA-7',
  'THETA-8','IOTA-9','KAPPA-10','LAMBDA-11','MU-12','NU-13','XI-14',
  'OMICRON-15','PI-16','RHO-17','SIGMA-18','TAU-19','UPSILON-20','PHI-21','GOVINDA'
);

-- Ensure admin credentials
INSERT INTO admins (username, password)
VALUES ('heisenberg', 'heisenberg')
ON CONFLICT (username) DO NOTHING;

-- Insert real competition teams (name = team name, code = password for login)
INSERT INTO teams (name, code) VALUES
  ('CIPHER-SYNDICATE',    'Cipher26'),
  ('SANTHOSH.V',          'AI&DS 007'),
  ('RUNTIME_RUBBLES',     'Saha@100807'),
  ('BYTE-BIGILS',         'byte(2026@bigils)'),
  ('BASS-TECHIES',        'bass-atti-67'),
  ('HASHIRA-TECH',        'VADH1792'),
  ('OG-CODERS',           'barani008'),
  ('THE-VISIONARIES',     'ramgowthamp2007'),
  ('QUANTUM-CODERS',      'SIMATS26'),
  ('TEAM-NOVA-',          'teamnovaXtechtitans'),
  ('OMEGA',               'stjosephs'),
  ('MANJA-PAI',           '100000'),
  ('JUSTICE-SOCIETY',     'girihajaharijesh'),
  ('SV2-XTREME',          'SV2SV2@'),
  ('SHADOW-HACKERS',      'Karthika*14122006'),
  ('KERNAL-KING',         'karthika*100724'),
  ('AUTOMINDS',           'Automation'),
  ('AI-TRINITY',          'Ai@2005'),
  ('EVENT-VAROM-GUYS',    '123ABC'),
  ('QUADVERTEX',          'ktpv*2027'),
  ('HACK4',               '@Hack4'),
  ('TECH-BYTE',           'LISD067'),
  ('SHECODES',            'Shecodes2468'),
  ('COREVA',              'Coreva2468'),
  ('CODE-RUSH',           'coderushers'),
  ('TECH-WIZARD',         'Techwizard2468'),
  ('AVENGERS_',           'Avengers1234'),
  ('TEAM-ALOK-',          'Tharun@8392'),
  ('TEAM-TITANS-',        '8019253'),
  ('NEURO-TECH',          '25102007'),
  ('POWER-HOUSE',         'SPIHER-2006'),
  ('ADENGAPPA-4-PERU',    '90709'),
  ('THE-RED-CHIP',        'pEFR9BrW8wvu2rE'),
  ('BOLLA-DEEPAK',        '806'),
  ('NEXUS-AI',            'nexus@2026'),
  ('HACKOHOLICSS',        'vasanth.s17'),
  ('404-NOT-FOUND',       'legenddharani'),
  ('GENERATIVE-AI',       'kaavi@2008'),
  ('NAANGA-NAALU-PERU',   'Kalai@2007'),
  ('ALTIORAX',            'PMRR_02'),
  ('ZORVEX',              'thanu@03'),
  ('ELITE-CODERS',        'elite@2026'),
  ('ZYNTRIX',             'zyn@1234'),
  ('TECH-TITANS',         '809848')
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT name, code FROM teams ORDER BY name;
