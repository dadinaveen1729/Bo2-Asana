-- Attachments could only ever be attached to a task. Asana's Files tab also
-- lets you upload a file straight to the project, not tied to any task.
alter table attachments alter column task_id drop not null;
alter table attachments add column if not exists project_id uuid references projects(id) on delete cascade;
alter table attachments add constraint attachments_task_or_project_chk check (task_id is not null or project_id is not null);

drop policy if exists attachments_all on attachments;
create policy attachments_all on attachments for all using (
  (task_id is not null and is_workspace_member(workspace_of_task(task_id)))
  or (project_id is not null and can_access_project(project_id))
);
