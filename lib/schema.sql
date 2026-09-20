-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It creates the tables, the public `photos` bucket, and its access policies.
-- Row level security is intentionally left off: the demo has no login, every
-- client is an anonymous device with a locally generated uuid.

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text unique not null,
  goal int not null default 50,
  -- Clearing the last level advances level to goal + 1: that means the map is
  -- finished and the family is picking its next goal.
  level int not null default 1,
  cadence text not null default 'daily',
  reward_text text,
  current_streak int not null default 0,
  created_at timestamptz default now()
);

-- A cadence change is a vote: it only applies once every member approves.
alter table groups add column if not exists pending_cadence text;
alter table groups add column if not exists cadence_approvals text[] not null default '{}';

-- So is a change of reward or of how many levels lead to it.
alter table groups add column if not exists pending_reward_text text;
alter table groups add column if not exists pending_reward_goal int;
alter table groups add column if not exists reward_approvals text[] not null default '{}';

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

-- `profiles.group_id` is only the family a device currently has open. Joining
-- another family used to erase the old membership, so past members vanished
-- from the member list and their posts lost their name.
create table if not exists memberships (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (group_id, user_id)
);

insert into memberships (group_id, user_id)
select group_id, id from profiles where group_id is not null
on conflict do nothing;

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
  kind text not null check (kind in ('photo', 'voice', 'text')),
  content text not null,
  caption text,
  created_at timestamptz default now()
);

alter table posts add column if not exists caption text;

-- Voice notes came later than the table.
alter table posts drop constraint if exists posts_kind_check;
alter table posts add constraint posts_kind_check check (kind in ('photo', 'voice', 'text'));

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid,
  kind text not null check (kind in ('like', 'emoji', 'comment')),
  value text,
  created_at timestamptz default now()
);

-- Realtime: every client refetches when any of these change. Adding a table
-- that is already published is an error, so this whole file stays re-runnable.
do $$
declare t text;
begin
  foreach t in array array['groups', 'profiles', 'tasks', 'posts', 'reactions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

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
