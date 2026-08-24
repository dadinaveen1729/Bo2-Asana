-- Any project member should be able to share that project by email, not
-- just workspace owners/admins — the original policy only allowed the
-- latter, which would silently 42501 for a regular editor trying to share.
drop policy if exists invites_insert on invites;
create policy invites_insert on invites for insert with check (
  workspace_role_of(workspace_id) in ('owner','admin')
  or (project_id is not null and exists (
    select 1 from project_members pm where pm.project_id = invites.project_id and pm.user_id = auth.uid()
  ))
);
