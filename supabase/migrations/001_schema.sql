-- BoostFlow core schema
create extension if not exists pgcrypto;

create type workspace_role as enum ('owner','admin','member','guest');
create type project_role as enum ('owner','editor','commenter','viewer');
create type project_privacy as enum ('public','private');
create type project_status as enum ('on_track','at_risk','off_track','on_hold','complete');
create type task_priority as enum ('low','medium','high');
create type custom_field_type as enum ('text','number','single_select','multi_select','date','people','checkbox');
create type notification_type as enum ('assigned','mentioned','comment','due_soon','completed','status_change','added_to_project','dependency_cleared');
create type goal_status as enum ('on_track','at_risk','off_track','not_started','achieved','missed');
create type automation_trigger as enum ('task_added_to_section','task_completed','task_created','due_date_arrives','custom_field_changed','assignee_changed');
create type automation_action as enum ('move_to_section','set_assignee','set_custom_field','add_comment','set_due_date','notify_user','add_tag');
create type dependency_type as enum ('blocking','waiting_on');

-- profiles mirrors auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  avatar_color text default '#6C5CE7',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'member',
  invited_by uuid references profiles(id),
  token uuid not null default gen_random_uuid(),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  icon text default 'users',
  color text default '#6C5CE7',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',
  primary key (team_id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  description text,
  icon text default 'layout-grid',
  color text default '#F06A6A',
  privacy project_privacy not null default 'public',
  status project_status not null default 'on_track',
  status_note text,
  default_view text not null default 'list',
  archived boolean not null default false,
  due_date date,
  start_date date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role project_role not null default 'editor',
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  position numeric not null default 1000,
  is_completed_section boolean not null default false,
  created_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#6C5CE7',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  name text not null,
  notes text,
  assignee_id uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id),
  priority task_priority,
  start_date date,
  due_date date,
  due_time time,
  completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  position numeric not null default 1000,
  is_milestone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_projects (
  task_id uuid not null references tasks(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  section_id uuid references sections(id) on delete set null,
  position numeric not null default 1000,
  primary key (task_id, project_id)
);

create table task_dependencies (
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  type dependency_type not null default 'blocking',
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id)
);

create table task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table task_followers (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

create table task_likes (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  type custom_field_type not null,
  options jsonb not null default '[]',
  position numeric not null default 1000,
  created_at timestamptz not null default now()
);

create table custom_field_values (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_date date,
  value_bool boolean,
  value_option_ids jsonb not null default '[]',
  value_user_id uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (task_id, custom_field_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  actor_id uuid references profiles(id),
  task_id uuid references tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table portfolios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#6C5CE7',
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table portfolio_projects (
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (portfolio_id, project_id)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_goal_id uuid references goals(id) on delete set null,
  name text not null,
  description text,
  owner_id uuid references profiles(id),
  status goal_status not null default 'not_started',
  progress numeric not null default 0,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goal_projects (
  goal_id uuid not null references goals(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (goal_id, project_id)
);

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  trigger_type automation_trigger not null,
  trigger_config jsonb not null default '{}',
  action_type automation_action not null,
  action_config jsonb not null default '{}',
  enabled boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  fields jsonb not null default '[]',
  target_section_id uuid references sections(id) on delete set null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_tasks_workspace on tasks(workspace_id);
create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_parent on tasks(parent_task_id);
create index idx_task_projects_project on task_projects(project_id, section_id);
create index idx_task_projects_task on task_projects(task_id);
create index idx_comments_task on comments(task_id);
create index idx_activity_task on activity_log(task_id);
create index idx_notifications_user on notifications(user_id, read);
create index idx_projects_workspace on projects(workspace_id);
create index idx_custom_field_values_task on custom_field_values(task_id);
