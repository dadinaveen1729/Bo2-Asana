insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy storage_avatars_read on storage.objects for select using (bucket_id = 'avatars');
create policy storage_avatars_write on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy storage_avatars_update on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy storage_avatars_delete on storage.objects for delete using (bucket_id = 'avatars' and auth.role() = 'authenticated');
