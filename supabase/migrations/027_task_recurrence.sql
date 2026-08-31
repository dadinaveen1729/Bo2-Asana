-- Adds Asana-style "repeat" to tasks. due_time already existed on the
-- table (set at table-creation time) but was never wired into any UI --
-- this migration only adds what's actually new: recurrence itself.
--
-- On completing a task whose recurrence isn't 'none', automatically
-- create the next occurrence (same name/assignee/priority/due time/
-- project placement/section/tags), with its due date advanced by the
-- chosen interval -- mirroring how Asana's own recurring tasks behave
-- (complete one, the next instance appears). The completed task itself
-- is left alone; nothing here touches its due date or completed state.
alter table tasks add column recurrence text not null default 'none'
  check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

create or replace function create_next_recurrence()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  base_date date;
  next_due date;
  new_task_id uuid;
begin
  if new.completed = true and old.completed is distinct from true and coalesce(new.recurrence, 'none') <> 'none' then
    base_date := coalesce(new.due_date, current_date);
    next_due := case new.recurrence
      when 'daily' then base_date + 1
      when 'weekly' then base_date + 7
      when 'monthly' then (base_date + interval '1 month')::date
      else null
    end;
    if next_due is null then
      return new;
    end if;

    insert into tasks (
      workspace_id, name, notes, assignee_id, priority, due_date, due_time,
      is_milestone, recurrence, created_by
    )
    values (
      new.workspace_id, new.name, new.notes, new.assignee_id, new.priority, next_due, new.due_time,
      new.is_milestone, new.recurrence, new.created_by
    )
    returning id into new_task_id;

    insert into task_projects (task_id, project_id, section_id, position)
    select new_task_id, project_id, section_id, position from task_projects where task_id = new.id;

    insert into task_tags (task_id, tag_id)
    select new_task_id, tag_id from task_tags where task_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_create_next_recurrence after update of completed on tasks
  for each row execute function create_next_recurrence();
