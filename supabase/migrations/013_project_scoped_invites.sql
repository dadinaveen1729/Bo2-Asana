-- Let an invite optionally target a specific project, so inviting someone
-- by email to a project adds them to that project the moment they sign up,
-- not just the shared workspace.
alter table invites add column if not exists project_id uuid references projects(id) on delete cascade;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  ws_id uuid;
  assigned_role workspace_role;
  inv record;
begin
  if new.email !~* '@boostoxygen\.com$' then
    raise exception 'Sign up is restricted to Boost Oxygen company email addresses.';
  end if;

  insert into profiles (id, email, full_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    ('#' || substr(md5(new.email), 1, 6))
  );

  select id into ws_id from workspaces where is_default = true limit 1;

  if lower(new.email) in ('rob@boostoxygen.com', 'matt@boostoxygen.com', 'mikegrice@boostoxygen.com', 'naveen@boostoxygen.com') then
    assigned_role := 'admin';
  else
    assigned_role := 'member';
  end if;

  if ws_id is null then
    insert into workspaces (name, slug, created_by, is_default)
    values ('Boost Oxygen', 'boost-oxygen', new.id, true)
    returning id into ws_id;
    insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  else
    insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, assigned_role)
    on conflict do nothing;
  end if;

  -- Honor any pending project-scoped invites sent to this email.
  for inv in
    select id, project_id from invites
    where lower(email) = lower(new.email) and accepted = false and project_id is not null
  loop
    insert into project_members (project_id, user_id, role)
    values (inv.project_id, new.id, 'editor')
    on conflict do nothing;
    update invites set accepted = true where id = inv.id;
  end loop;

  update invites set accepted = true where lower(email) = lower(new.email) and accepted = false and project_id is null;

  return new;
end;
$$;
