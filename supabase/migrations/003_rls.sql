alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table invites enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table sections enable row level security;
alter table tags enable row level security;
alter table tasks enable row level security;
alter table task_projects enable row level security;
alter table task_dependencies enable row level security;
alter table task_tags enable row level security;
alter table task_followers enable row level security;
alter table task_likes enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table comments enable row level security;
alter table attachments enable row level security;
alter table activity_log enable row level security;
alter table notifications enable row level security;
alter table portfolios enable row level security;
alter table portfolio_projects enable row level security;
alter table goals enable row level security;
alter table goal_projects enable row level security;
alter table automation_rules enable row level security;
alter table forms enable row level security;

-- profiles: anyone authenticated can read (needed for assignee pickers etc), only self can update
create policy profiles_select on profiles for select using (auth.role() = 'authenticated');
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- workspaces
create policy workspaces_select on workspaces for select using (is_workspace_member(id));
create policy workspaces_insert on workspaces for insert with check (created_by = auth.uid());
create policy workspaces_update on workspaces for update using (workspace_role_of(id) in ('owner','admin'));

-- workspace_members
create policy wm_select on workspace_members for select using (is_workspace_member(workspace_id));
create policy wm_insert_self_owner on workspace_members for insert with check (
  user_id = auth.uid() and exists (select 1 from workspaces w where w.id = workspace_id and w.created_by = auth.uid())
);
create policy wm_insert_by_admin on workspace_members for insert with check (
  workspace_role_of(workspace_id) in ('owner','admin')
);
create policy wm_update on workspace_members for update using (workspace_role_of(workspace_id) in ('owner','admin'));
create policy wm_delete on workspace_members for delete using (
  workspace_role_of(workspace_id) in ('owner','admin') or user_id = auth.uid()
);

-- invites
create policy invites_select on invites for select using (
  workspace_role_of(workspace_id) in ('owner','admin') or email = (auth.jwt()->>'email')
);
create policy invites_insert on invites for insert with check (workspace_role_of(workspace_id) in ('owner','admin'));
create policy invites_update on invites for update using (
  workspace_role_of(workspace_id) in ('owner','admin') or email = (auth.jwt()->>'email')
);
create policy invites_delete on invites for delete using (workspace_role_of(workspace_id) in ('owner','admin'));

-- teams
create policy teams_select on teams for select using (is_workspace_member(workspace_id));
create policy teams_insert on teams for insert with check (is_workspace_member(workspace_id));
create policy teams_update on teams for update using (is_workspace_member(workspace_id));
create policy teams_delete on teams for delete using (workspace_role_of(workspace_id) in ('owner','admin'));

create policy team_members_select on team_members for select using (
  is_workspace_member((select workspace_id from teams where id = team_id))
);
create policy team_members_write on team_members for all using (
  is_workspace_member((select workspace_id from teams where id = team_id))
);

-- projects
create policy projects_select on projects for select using (can_access_project(id));
create policy projects_insert on projects for insert with check (is_workspace_member(workspace_id));
create policy projects_update on projects for update using (is_workspace_member(workspace_id));
create policy projects_delete on projects for delete using (is_workspace_member(workspace_id));

create policy project_members_select on project_members for select using (
  is_workspace_member((select workspace_id from projects where id = project_id))
);
create policy project_members_write on project_members for all using (
  is_workspace_member((select workspace_id from projects where id = project_id))
);

-- sections
create policy sections_all on sections for all using (can_access_project(project_id));

-- tags
create policy tags_all on tags for all using (is_workspace_member(workspace_id));

-- tasks
create policy tasks_select on tasks for select using (is_workspace_member(workspace_id));
create policy tasks_insert on tasks for insert with check (is_workspace_member(workspace_id));
create policy tasks_update on tasks for update using (is_workspace_member(workspace_id));
create policy tasks_delete on tasks for delete using (is_workspace_member(workspace_id));

create policy task_projects_all on task_projects for all using (can_access_project(project_id));

create policy task_dependencies_all on task_dependencies for all using (
  is_workspace_member(workspace_of_task(task_id))
);

create policy task_tags_all on task_tags for all using (
  is_workspace_member(workspace_of_task(task_id))
);

create policy task_followers_all on task_followers for all using (
  is_workspace_member(workspace_of_task(task_id))
);

create policy task_likes_all on task_likes for all using (
  is_workspace_member(workspace_of_task(task_id))
);

-- custom fields
create policy custom_fields_all on custom_fields for all using (is_workspace_member(workspace_id));
create policy custom_field_values_all on custom_field_values for all using (
  is_workspace_member(workspace_of_task(task_id))
);

-- comments
create policy comments_select on comments for select using (is_workspace_member(workspace_of_task(task_id)));
create policy comments_insert on comments for insert with check (
  is_workspace_member(workspace_of_task(task_id)) and author_id = auth.uid()
);
create policy comments_update on comments for update using (author_id = auth.uid());
create policy comments_delete on comments for delete using (author_id = auth.uid());

-- attachments
create policy attachments_all on attachments for all using (is_workspace_member(workspace_of_task(task_id)));

-- activity_log: read-only from client, written only by triggers (security definer, bypasses RLS)
create policy activity_log_select on activity_log for select using (
  task_id is null or is_workspace_member(workspace_of_task(task_id))
);

-- notifications: strictly own rows
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_delete on notifications for delete using (user_id = auth.uid());

-- portfolios
create policy portfolios_all on portfolios for all using (is_workspace_member(workspace_id));
create policy portfolio_projects_all on portfolio_projects for all using (
  is_workspace_member((select workspace_id from portfolios where id = portfolio_id))
);

-- goals
create policy goals_all on goals for all using (is_workspace_member(workspace_id));
create policy goal_projects_all on goal_projects for all using (
  is_workspace_member((select workspace_id from goals where id = goal_id))
);

-- automation rules + forms
create policy automation_rules_all on automation_rules for all using (can_access_project(project_id));
create policy forms_all on forms for all using (can_access_project(project_id));

-- storage bucket for attachments
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy storage_attachments_read on storage.objects for select using (
  bucket_id = 'attachments' and auth.role() = 'authenticated'
);
create policy storage_attachments_write on storage.objects for insert with check (
  bucket_id = 'attachments' and auth.role() = 'authenticated'
);
create policy storage_attachments_delete on storage.objects for delete using (
  bucket_id = 'attachments' and auth.role() = 'authenticated'
);
