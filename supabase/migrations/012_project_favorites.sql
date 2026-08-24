-- Lets a user pin/star projects to their sidebar (Asana-style favoriting).
-- One row per (user, project); purely a personal bookmark, scoped by RLS to
-- the owning user so nobody can see or modify another user's favorites.
create table project_favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table project_favorites enable row level security;

create policy project_favorites_select on project_favorites for select using (user_id = auth.uid());
create policy project_favorites_insert on project_favorites for insert with check (user_id = auth.uid());
create policy project_favorites_delete on project_favorites for delete using (user_id = auth.uid());

alter publication supabase_realtime add table project_favorites;
