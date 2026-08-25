-- Two real bugs from the Asana importer:
--
-- 1. Every project-creation path (New Project, Asana import, spreadsheet
--    import) hardcoded privacy: 'public', and can_access_project_row()
--    treats 'public' as "visible to every workspace member" by design. So
--    every imported project showed up in every single account's Home page,
--    not just people it was actually shared with.
--
-- 2. log_task_activity() fires an 'assigned' notification (which also
--    triggers a real email, per 018's allowlist) on every task insert that
--    has an assignee set. The importer inserts many historical tasks in one
--    batch, each with an assignee -- so importing one project with, say, 25
--    of Anne's tasks fired 25 real assignment emails at once. Bulk-imported
--    historical data isn't a new assignment happening right now and
--    shouldn't notify like one.

-- Default flips to private -- a project should only be visible to people
-- it's actually been shared with, not the whole workspace, unless someone
-- deliberately makes it "team-wide" via the existing privacy toggle.
alter table projects alter column privacy set default 'private';

-- Marks a task as bulk-imported (Asana import, CSV/Excel import) so the
-- notification trigger below can skip firing for it.
alter table tasks add column if not exists imported boolean not null default false;

create or replace function log_task_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into activity_log (task_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'created', jsonb_build_object('name', new.name));
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

-- One-time cleanup for projects already imported public: preserve access
-- for whoever actually has work in them (the creator, plus anyone with a
-- task assigned there) as explicit members, then lock the project down to
-- private. This tightens visibility without silently kicking anyone off
-- work they're actively assigned to.
insert into project_members (project_id, user_id, role)
select distinct p.id, t.assignee_id, 'editor'::project_role
from projects p
join task_projects tp on tp.project_id = p.id
join tasks t on t.id = tp.task_id
where p.privacy = 'public' and t.assignee_id is not null
on conflict do nothing;

insert into project_members (project_id, user_id, role)
select p.id, p.created_by, 'owner'::project_role
from projects p
where p.privacy = 'public' and p.created_by is not null
on conflict do nothing;

update projects set privacy = 'private' where privacy = 'public';
