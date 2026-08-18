# Migrations

`../tables.sql` is the current schema and is safe to re-run at any time.

If you were running an earlier build of Action, apply `001_upgrade_from_v0.sql`
**before** `tables.sql`. It renames and adds the columns this version expects
without touching your existing tasks.
