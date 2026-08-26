-- Nothing stopped the Asana import from being clicked twice for the same
-- project -- each click created a brand-new project + tasks from scratch,
-- no memory of "this was already imported." Fred triple-clicked in a
-- 5-minute window and ended up with 39 projects instead of 13.
--
-- Track which Asana project each import came from, and enforce at the DB
-- level that the same Asana project can't be imported twice into the same
-- workspace -- the app checks this before creating anything
-- (src/app/api/asana/import/route.ts).
alter table projects add column if not exists asana_gid text;

create unique index if not exists projects_workspace_asana_gid_key
  on projects (workspace_id, asana_gid)
  where asana_gid is not null;
