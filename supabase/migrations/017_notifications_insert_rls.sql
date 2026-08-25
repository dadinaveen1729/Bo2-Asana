-- Notifications previously had select/update/delete policies but no insert
-- policy, so RLS silently denied every client-side insert (only
-- SECURITY DEFINER triggers, which bypass RLS as the table owner, could
-- create one). Needed now that @mention detection inserts notifications
-- directly from the client.
create policy notifications_insert on notifications for insert with check (
  exists (
    select 1 from workspace_members wm_actor
    join workspace_members wm_target on wm_target.workspace_id = wm_actor.workspace_id
    where wm_actor.user_id = auth.uid() and wm_target.user_id = notifications.user_id
  )
);
