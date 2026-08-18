-- =============================================================================
-- Action — database schema
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- It is idempotent: re-running it is safe and will not drop data.
--
-- Security model: every table is protected by Row Level Security so a user can
-- only ever read or write their own rows. The anon key shipped to the browser
-- is useless without a valid session because of these policies.
-- =============================================================================

-- Needed for gen_random_uuid() on older projects.
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,

  title            text not null check (char_length(title) between 1 and 500),
  notes            text not null default '',

  is_completed     boolean not null default false,
  completed_at     timestamptz,
  status           text not null default 'backlog'
                     check (status in ('backlog', 'today', 'doing', 'done')),
  priority         text not null default 'medium'
                     check (priority in ('urgent', 'high', 'medium', 'low')),

  due_date         timestamptz,
  has_time         boolean not null default false,
  recurrence       text check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly')),

  tags             text[] not null default '{}',
  subtasks         jsonb  not null default '[]'::jsonb,

  estimate_minutes integer check (estimate_minutes is null or estimate_minutes > 0),
  actual_minutes   integer check (actual_minutes is null or actual_minutes >= 0),

  -- Fractional index for manual ordering on the board. Doubles let a card be
  -- dropped between two neighbours without renumbering the column.
  position         double precision not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Indexes matching the queries the app actually issues.
create index if not exists tasks_user_created_idx  on public.tasks (user_id, created_at desc);
create index if not exists tasks_user_due_idx      on public.tasks (user_id, due_date)
  where is_completed = false;
create index if not exists tasks_user_status_idx   on public.tasks (user_id, status, position);
create index if not exists tasks_user_completed_idx on public.tasks (user_id, completed_at desc)
  where is_completed = true;
create index if not exists tasks_tags_idx          on public.tasks using gin (tags);

-- -----------------------------------------------------------------------------
-- Keep updated_at honest, and keep completed_at consistent with is_completed
-- even when a row is changed outside the app (SQL editor, another client).
-- -----------------------------------------------------------------------------
create or replace function public.tasks_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.is_completed and new.completed_at is null then
    new.completed_at := now();
  elsif not new.is_completed then
    new.completed_at := null;
  end if;

  -- 'done' and is_completed are two views of the same fact; keep them in step.
  if new.is_completed and new.status is distinct from 'done' then
    new.status := 'done';
  elsif not new.is_completed and new.status = 'done' then
    new.status := 'backlog';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks are readable by their owner"  on public.tasks;
drop policy if exists "tasks are insertable by their owner" on public.tasks;
drop policy if exists "tasks are updatable by their owner"  on public.tasks;
drop policy if exists "tasks are deletable by their owner"  on public.tasks;

create policy "tasks are readable by their owner"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks are insertable by their owner"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks are updatable by their owner"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks are deletable by their owner"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Realtime
--
-- Lets a change made on your phone appear on your laptop without a refresh.
-- RLS still applies to realtime, so you only ever receive your own rows.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end
$$;

-- Realtime needs the full row on UPDATE/DELETE to build the payload.
alter table public.tasks replica identity full;
