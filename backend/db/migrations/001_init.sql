create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  access_code text not null unique,
  score integer default 0,
  current_level integer default 1,
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  level integer not null,
  attempts integer default 0,
  is_correct boolean default false,
  time_taken integer,
  submitted_at timestamptz default now()
);

create table if not exists challenge_data (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id),
  level integer not null,
  dataset_json jsonb not null,
  correct_hash text not null,
  created_at timestamptz default now()
);

create index if not exists idx_teams_access_code on teams(access_code);
create index if not exists idx_submissions_team_level on submissions(team_id, level);
create index if not exists idx_challenge_team_level on challenge_data(team_id, level);

alter table teams enable row level security;
alter table submissions enable row level security;
alter table challenge_data enable row level security;

create policy if not exists service_role_teams on teams for all to service_role using (true) with check (true);
create policy if not exists service_role_submissions on submissions for all to service_role using (true) with check (true);
create policy if not exists service_role_challenge_data on challenge_data for all to service_role using (true) with check (true);
