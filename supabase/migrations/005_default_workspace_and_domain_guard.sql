alter table workspaces add column if not exists is_default boolean not null default false;

-- Restrict signups to the Boost Oxygen company domain and auto-provision the shared workspace
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  ws_id uuid;
  member_count int;
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
  if ws_id is null then
    insert into workspaces (name, slug, created_by, is_default)
    values ('Boost Oxygen', 'boost-oxygen', new.id, true)
    returning id into ws_id;
    insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  else
    insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'member')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Allow a newly signed-up member to self-join the single default workspace
create policy wm_insert_self_default on workspace_members for insert with check (
  user_id = auth.uid()
  and role = 'member'
  and exists (select 1 from workspaces w where w.id = workspace_id and w.is_default = true)
);
