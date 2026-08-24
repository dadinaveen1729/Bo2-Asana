-- Fix mutable search_path warnings
alter function is_workspace_member(uuid) set search_path = public, pg_temp;
alter function workspace_role_of(uuid) set search_path = public, pg_temp;
alter function can_access_project(uuid) set search_path = public, pg_temp;
alter function workspace_of_task(uuid) set search_path = public, pg_temp;
alter function handle_new_user() set search_path = public, pg_temp;
alter function set_updated_at() set search_path = public, pg_temp;
alter function handle_task_completed() set search_path = public, pg_temp;
alter function log_task_activity() set search_path = public, pg_temp;
alter function log_comment_activity() set search_path = public, pg_temp;
alter function auto_follow_task() set search_path = public, pg_temp;

-- Trigger-only functions should never be callable directly via the REST RPC surface
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function handle_task_completed() from public, anon, authenticated;
revoke execute on function log_task_activity() from public, anon, authenticated;
revoke execute on function log_comment_activity() from public, anon, authenticated;
revoke execute on function auto_follow_task() from public, anon, authenticated;

-- RLS helper functions: only needed by signed-in (authenticated) queries, never by anon
revoke execute on function is_workspace_member(uuid) from anon;
revoke execute on function workspace_role_of(uuid) from anon;
revoke execute on function can_access_project(uuid) from anon;
revoke execute on function workspace_of_task(uuid) from anon;
