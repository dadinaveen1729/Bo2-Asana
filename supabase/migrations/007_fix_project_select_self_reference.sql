-- The projects_select policy called can_access_project(id), which internally
-- re-queried the projects table by id. On INSERT ... RETURNING (used by every
-- .insert().select() call from the client), that self-referential subquery
-- could not reliably see the just-inserted, not-yet-committed row, causing
-- "new row violates row-level security policy for table projects" even though
-- the row satisfied every real access rule. Fix: evaluate the policy directly
-- against the row's own columns (passed in, not re-fetched) so there is no
-- self-reference on the projects table at all.

create or replace function can_access_project_row(p_privacy project_privacy, p_workspace_id uuid, p_id uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  )
  and (
    p_privacy = 'public'
    or exists (select 1 from project_members pm where pm.project_id = p_id and pm.user_id = auth.uid())
  );
$$;

revoke execute on function can_access_project_row(project_privacy, uuid, uuid) from anon;

drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (can_access_project_row(privacy, workspace_id, id));
