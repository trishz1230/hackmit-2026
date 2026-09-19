-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It creates the tables, the public `photos` bucket, and its access policies.
-- Row level security is intentionally left off: the demo has no login, every
-- client is an anonymous device with a locally generated uuid.

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text unique not null,
  goal int not null default 50,
  level int not null default 1,
  cadence text not null default 'daily',
  reward_text text,
  current_streak int not null default 0,
  created_at timestamptz default now()
);

-- A cadence change is a vote: it only applies once every member approves.
alter table groups add column if not exists pending_cadence text;
alter table groups add column if not exists cadence_approvals text[] not null default '{}';

create table if not exists profiles (
  id uuid primary key,
  name text not null,
  group_id uuid references groups(id) on delete set null,
  avatar text default '🙂',
  phone text,
  expo_push_token text,
  created_at timestamptz default now()
);

alter table profiles add column if not exists expo_push_token text;

-- One task per level, so a family can clear several levels in one demo.
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  level int not null,
  prompt text not null,
  created_at timestamptz default now(),
  unique (group_id, level)
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

-- Realtime: every client refetches when any of these change.
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table reactions;

-- Photo storage.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos are readable" on storage.objects;
create policy "photos are readable" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "anyone can upload a photo" on storage.objects;
create policy "anyone can upload a photo" on storage.objects
  for insert with check (bucket_id = 'photos');
