-- =============================================================================
-- Upgrade an existing Action database to the current schema.
--
-- Run this BEFORE ../tables.sql if your `tasks` table predates this version.
-- Every statement is guarded, so running it twice is harmless.
-- =============================================================================

-- `description` became `notes`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'description'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'notes'
  ) then
    alter table public.tasks rename column description to notes;
  end if;
end
$$;

-- `estimated_time` / `actual_time` became explicit minute columns.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'estimated_time'
  ) then
    alter table public.tasks rename column estimated_time to estimate_minutes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'actual_time'
  ) then
    alter table public.tasks rename column actual_time to actual_minutes;
  end if;
end
$$;

-- New columns this version relies on.
alter table public.tasks add column if not exists notes            text not null default '';
alter table public.tasks add column if not exists completed_at     timestamptz;
alter table public.tasks add column if not exists has_time         boolean not null default false;
alter table public.tasks add column if not exists recurrence       text;
alter table public.tasks add column if not exists position         double precision not null default 0;
alter table public.tasks add column if not exists updated_at       timestamptz not null default now();
alter table public.tasks add column if not exists estimate_minutes integer;
alter table public.tasks add column if not exists actual_minutes   integer;
alter table public.tasks add column if not exists status           text not null default 'backlog';

-- Normalise any status values the old build could produce.
update public.tasks set status = 'done'    where is_completed and status is distinct from 'done';
update public.tasks set status = 'backlog' where not is_completed
  and (status is null or status not in ('backlog', 'today', 'doing'));

-- Best-effort backfill for completion timestamps. Rows completed before this
-- upgrade have no real completion time, so `updated_at` is the closest honest
-- approximation; the app tells the user these rows may be missing from
-- time-based charts.
update public.tasks
   set completed_at = coalesce(updated_at, created_at)
 where is_completed and completed_at is null;

-- Give existing rows a stable manual order.
with numbered as (
  select id, row_number() over (partition by user_id order by created_at) * 1000 as pos
    from public.tasks
)
update public.tasks t
   set position = numbered.pos
  from numbered
 where t.id = numbered.id and t.position = 0;

-- The old build stored a separate stats table; progress is now derived from the
-- tasks themselves, so nothing reads it any more. Drop it when you are ready:
--   drop table if exists public.user_stats;
