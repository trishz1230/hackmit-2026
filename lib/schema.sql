-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Then: Storage -> create a public bucket named `photos`,
--       Authentication -> Providers -> enable Anonymous sign-ins.
-- Row level security is intentionally left off for the hackathon demo.

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text unique not null,
  goal int not null default 50,
  level int not null default 0,
  cadence text not null default 'daily',
  reward_text text,
  current_streak int not null default 0,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key,
  name text not null,
  group_id uuid references groups(id),
  avatar text default '🙂',
  phone text,
  push_token text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  prompt text not null,
  cycle_date date not null default current_date,
  created_at timestamptz default now(),
  unique (group_id, cycle_date)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  user_id uuid,
  kind text not null check (kind in ('photo', 'text')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid,
  kind text not null check (kind in ('like', 'emoji', 'comment')),
  value text,
  created_at timestamptz default now()
);

-- Realtime feed updates
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table reactions;
