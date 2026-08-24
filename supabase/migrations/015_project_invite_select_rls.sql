-- Same reasoning as the insert policy: a project member who just invited
-- someone to their project needs to be able to see that pending invite,
-- not just workspace owners/admins.
drop policy if exists invites_select on invites;
create policy invites_select on invites for select using (
  workspace_role_of(workspace_id) in ('owner','admin')
  or email = (auth.jwt()->>'email')
  or (project_id is not null and exists (
    select 1 from project_members pm where pm.project_id = invites.project_id and pm.user_id = auth.uid()
  ))
);
