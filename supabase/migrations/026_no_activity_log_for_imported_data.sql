-- Same class of bug as 022 (real notifications firing for historical
-- import data) and 025 (comments version of the same thing) -- except
-- this time it's the Project Overview's "Recent activity" feed itself.
-- log_task_activity() unconditionally logged a 'created' entry
-- (attributed to whoever ran the import, timestamped "now") on every
-- task insert regardless of the `imported` flag, and log_comment_activity()
-- did the exact same for 'commented' -- so re-importing/backfilling a
-- project's history flooded its Recent Activity with dozens of "X created
-- a task" entries that all actually happened months or years ago in
-- Asana, not "3 minutes ago" as shown.
--
-- Only suppresses the INSERT-time 'created'/'commented' log entry for
-- historical data -- a genuine later edit to an imported task (reassign,
-- complete, due date change) still logs normally, since that's real
-- activity happening now, regardless of the task's origin.
create or replace function log_task_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    if not new.imported then
      insert into activity_log (task_id, actor_id, action, meta)
      values (new.id, auth.uid(), 'created', jsonb_build_object('name', new.name));
    end if;
    if new.assignee_id is not null and new.assignee_id <> auth.uid() and not new.imported then
      insert into notifications (user_id, type, actor_id, task_id, message)
      values (new.assignee_id, 'assigned', auth.uid(), new.id, new.name);
    end if;
  elsif tg_op = 'UPDATE' then
    if new.completed is distinct from old.completed and new.completed = true then
      insert into activity_log (task_id, actor_id, action, meta)
      values (new.id, auth.uid(), 'completed', '{}');
    end if;
    if new.assignee_id is distinct from old.assignee_id then
      insert into activity_log (task_id, actor_id, action, meta)
      values (new.id, auth.uid(), 'reassigned', jsonb_build_object('assignee_id', new.assignee_id));
      if new.assignee_id is not null and new.assignee_id <> auth.uid() and not new.imported then
        insert into notifications (user_id, type, actor_id, task_id, message)
        values (new.assignee_id, 'assigned', auth.uid(), new.id, new.name);
      end if;
    end if;
    if new.due_date is distinct from old.due_date then
      insert into activity_log (task_id, actor_id, action, meta)
      values (new.id, auth.uid(), 'due_date_changed', jsonb_build_object('due_date', new.due_date));
    end if;
  end if;
  return new;
end;
$$;

create or replace function log_comment_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  t tasks%rowtype;
  follower record;
begin
  select * into t from tasks where id = new.task_id;

  if not new.imported then
    insert into activity_log (task_id, actor_id, action, meta)
    values (new.task_id, new.author_id, 'commented', jsonb_build_object('comment_id', new.id));
  end if;

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
