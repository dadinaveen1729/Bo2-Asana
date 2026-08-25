-- The Inbox "Bookmarks" tab was a static empty-state with no backing table
-- -- decorative, not real functionality. Lets a user bookmark any of their
-- own notifications; scoped entirely to the owning user (bookmarking is
-- personal, like starring an email).
create table notification_bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  notification_id uuid not null references notifications(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table notification_bookmarks enable row level security;

create policy notification_bookmarks_select on notification_bookmarks for select using (user_id = auth.uid());
create policy notification_bookmarks_insert on notification_bookmarks for insert with check (user_id = auth.uid());
create policy notification_bookmarks_delete on notification_bookmarks for delete using (user_id = auth.uid());

alter publication supabase_realtime add table notification_bookmarks;
