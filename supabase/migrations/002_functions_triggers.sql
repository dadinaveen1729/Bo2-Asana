-- Helper functions
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function workspace_role_of(ws_id uuid)
returns workspace_role language sql security definer stable as $$
  select role from workspace_members
  where workspace_id = ws_id and user_id = auth.uid();
$$;

create or replace function can_access_project(p_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from projects p
    join workspace_members wm on wm.workspace_id = p.workspace_id and wm.user_id = auth.uid()
    where p.id = p_id
      and (p.privacy = 'public' or exists (
        select 1 from project_members pm where pm.project_id = p.id and pm.user_id = auth.uid()
      ))
  );
$$;

create or replace function workspace_of_task(t_id uuid)
returns uuid language sql security definer stable as $$
  select workspace_id from tasks where id = t_id;
$$;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    ('#' || substr(md5(new.email), 1, 6))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- generic updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_workspaces_updated before update on workspaces for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks for each row execute function set_updated_at();
create trigger trg_goals_updated before update on goals for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_comments_updated before update on comments for each row execute function set_updated_at();

-- Task completion bookkeeping
create or replace function handle_task_completed()
returns trigger language plpgsql as $$
begin
  if new.completed = true and old.completed = false then
    new.completed_at = now();
    new.completed_by = auth.uid();
  elsif new.completed = false and old.completed = true then
    new.completed_at = null;
    new.completed_by = null;
  end if;
  return new;
end;
$$;

create trigger trg_task_completed before update of completed on tasks
  for each row execute function handle_task_completed();

-- Activity log + notification on assignment
create or replace function log_task_activity()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    insert into activity_log (task_id, actor_id, action, meta)
    values (new.id, auth.uid(), 'created', jsonb_build_object('name', new.name));
    if new.assignee_id is not null and new.assignee_id <> auth.uid() then
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
      if new.assignee_id is not null and new.assignee_id <> auth.uid() then
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

create trigger trg_task_activity after insert or update on tasks
  for each row execute function log_task_activity();

-- Comment notification (notify assignee + followers, not the author)
create or replace function log_comment_activity()
returns trigger language plpgsql security definer as $$
declare
  t tasks%rowtype;
  follower record;
begin
  select * into t from tasks where id = new.task_id;
  insert into activity_log (task_id, actor_id, action, meta)
  values (new.task_id, new.author_id, 'commented', jsonb_build_object('comment_id', new.id));

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

create trigger trg_comment_activity after insert on comments
  for each row execute function log_comment_activity();

-- Auto-follow: assignee and creator follow their tasks
create or replace function auto_follow_task()
returns trigger language plpgsql security definer as $$
begin
  if new.created_by is not null then
    insert into task_followers (task_id, user_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  if new.assignee_id is not null then
    insert into task_followers (task_id, user_id) values (new.id, new.assignee_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_auto_follow after insert or update of assignee_id on tasks
  for each row execute function auto_follow_task();
