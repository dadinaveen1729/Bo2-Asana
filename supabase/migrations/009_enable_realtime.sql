-- The supabase_realtime publication was never populated, so every
-- postgres_changes subscription in the app (project status changes, task
-- updates, notifications, teams, etc.) has been silently receiving no
-- events since launch. This turns realtime broadcasting on for every table
-- the client subscribes to.
alter publication supabase_realtime add table
  teams,
  projects,
  project_members,
  sections,
  tasks,
  task_projects,
  task_tags,
  task_likes,
  task_dependencies,
  comments,
  attachments,
  activity_log,
  custom_fields,
  custom_field_values,
  tags,
  automation_rules,
  goals,
  goal_projects,
  portfolios,
  portfolio_projects,
  team_members,
  notifications,
  profiles,
  workspace_members,
  invites;
