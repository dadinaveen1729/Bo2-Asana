-- 022 flipped the *default* project privacy from 'public' to 'private' to
-- stop projects leaking into every workspace member's Home page. But every
-- project-creation path (New Project, Asana import, spreadsheet import)
-- does `.insert({...privacy:'private'...}).select().single()` in one round
-- trip, and only adds the creator to project_members in a SEPARATE
-- statement right after. Postgres enforces a table's SELECT policy on the
-- RETURNING row of an INSERT, not just the INSERT's own WITH CHECK -- so at
-- the instant of that first insert, a brand-new private project has no
-- project_members row yet, can_access_project_row() correctly says "no",
-- and Postgres raises "new row violates row-level security policy for
-- table projects" even though the write itself was perfectly legitimate.
--
-- This is the exact same class of bug 007 fixed for the old 'public'
-- default (p_privacy = 'public' used to always be true at insert time,
-- papering over the "not a project_member yet" gap) -- 022 silently
-- reintroduced it the moment 'private' became the common case. Net effect:
-- every private project has been un-creatable since 022 shipped, which is
-- effectively every project, since every creation path explicitly passes
-- privacy: 'private'.
--
-- Fix: a project's creator can always see their own project, private or
-- not -- same as they can already see tasks/comments they authored
-- elsewhere in this schema. This isn't a re-opening of what 022 fixed --
-- 022 was about every OTHER workspace member seeing every project by
-- default; a creator seeing their own work was never the leak.

create or replace function can_access_project_row(p_privacy project_privacy, p_workspace_id uuid, p_id uuid, p_created_by uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  )
  and (
    p_privacy = 'public'
    or p_created_by = auth.uid()
    or exists (select 1 from project_members pm where pm.project_id = p_id and pm.user_id = auth.uid())
  );
$$;

revoke execute on function can_access_project_row(project_privacy, uuid, uuid, uuid) from anon;

drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (can_access_project_row(privacy, workspace_id, id, created_by));

-- Superseded 3-arg overload -- nothing should call this anymore.
drop function if exists can_access_project_row(project_privacy, uuid, uuid);

-- Same landmine, same fix, in the sibling helper every child table
-- (sections, task_projects, automation_rules, forms) uses to check access
-- to an *existing* project row.
create or replace function can_access_project(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from projects p
    join workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
    where p.id = p_id
      and (p.privacy = 'public' or p.created_by = auth.uid() or exists (
        select 1 from project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
  );
$$;
