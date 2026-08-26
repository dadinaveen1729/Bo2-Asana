-- Track which Asana task each imported task came from, mirroring
-- projects.asana_gid, so a re-import/backfill on an already-imported
-- project can find the right existing task instead of only working for
-- brand-new imports.
alter table tasks add column if not exists asana_gid text;
create unique index if not exists tasks_workspace_asana_gid_key
  on tasks (workspace_id, asana_gid) where asana_gid is not null;

-- Comments pulled in from Asana's history need the exact same "don't
-- spam real notifications for historical data" bypass already used for
-- imported tasks (022) -- otherwise importing 50 old comments floods
-- the task's assignee/followers with 50 real notification emails, one
-- per historical comment.
alter table comments add column if not exists imported boolean not null default false;
-- Tracks the source Asana story (comment) so re-running an import/
-- backfill never creates duplicate comments.
alter table comments add column if not exists asana_story_gid text;
create unique index if not exists comments_task_asana_story_gid_key
  on comments (task_id, asana_story_gid) where asana_story_gid is not null;

create or replace function log_comment_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t tasks%rowtype;
  follower record;
begin
  select * into t from tasks where id = new.task_id;
  insert into activity_log (task_id, actor_id, action, meta)
  values (new.task_id, new.author_id, 'commented', jsonb_build_object('comment_id', new.id));

  if new.imported then
    return new;
  end if;

  if t.assignee_id is not null and t.assignee_id <> new.author_id then
    insert into notifications (user_id, type, actor_id, task_id, message)
    values (t.assignee_id, 'comment', new.author_id, new.task_id, t.name);
  end if;

  for follower in select user_id from task_followers where task_id = new.task_id loop
    if follower.user_id <> new.author_id and follower.user_id is distinct from t.assignee_id then
      insert into notifications (user_id, type, actor_id, task_id, message)
      values (follower.user_id, 'comment', new.author_id, new.task_id, t.name);
    end if;
  end loop;
  return new;
end;
$$;
