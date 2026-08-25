-- Invites were still gated to owner/admin (or, for project-scoped invites,
-- to existing members of that specific project) — any other member trying
-- to invite a teammate hit a bare RLS 42501. The product intent is that
-- any workspace member can invite anyone, so widen insert/select to plain
-- workspace membership.
drop policy if exists invites_insert on invites;
create policy invites_insert on invites for insert with check (is_workspace_member(workspace_id));

drop policy if exists invites_select on invites;
create policy invites_select on invites for select using (
  is_workspace_member(workspace_id) or email = (auth.jwt()->>'email')
);
