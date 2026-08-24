-- Server-side automation execution: rules actually run when their trigger fires.
create or replace function apply_task_section_automations()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record;
begin
  if new.section_id is null then
    return new;
  end if;
  for r in
    select * from automation_rules
    where project_id = new.project_id
      and enabled = true
      and trigger_type = 'task_added_to_section'
      and (trigger_config->>'section_id')::uuid = new.section_id
  loop
    if r.action_type = 'set_assignee' then
      update tasks set assignee_id = (r.action_config->>'user_id')::uuid where id = new.task_id;
    elsif r.action_type = 'add_tag' then
      insert into task_tags (task_id, tag_id) values (new.task_id, (r.action_config->>'tag_id')::uuid)
      on conflict do nothing;
    elsif r.action_type = 'set_custom_field' then
      insert into custom_field_values (task_id, custom_field_id, value_text, value_option_ids)
      values (new.task_id, (r.action_config->>'custom_field_id')::uuid, r.action_config->>'value_text', coalesce(r.action_config->'value_option_ids', '[]'::jsonb))
      on conflict (task_id, custom_field_id) do update set value_text = excluded.value_text, value_option_ids = excluded.value_option_ids, updated_at = now();
    elsif r.action_type = 'notify_user' then
      insert into notifications (user_id, type, task_id, message)
      values ((r.action_config->>'user_id')::uuid, 'status_change', new.task_id, (select name from tasks where id = new.task_id));
    elsif r.action_type = 'set_due_date' then
      update tasks set due_date = current_date + make_interval(days => coalesce((r.action_config->>'days_from_now')::int, 0)) where id = new.task_id;
    elsif r.action_type = 'add_comment' then
      insert into comments (task_id, author_id, body) values (new.task_id, null, coalesce(r.action_config->>'body', 'Automation triggered.'));
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_task_section_automations on task_projects;
create trigger trg_task_section_automations
  after insert or update of section_id on task_projects
  for each row execute function apply_task_section_automations();

create or replace function apply_task_completed_automations()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r record;
  tp record;
begin
  if new.completed = true and (old.completed is distinct from new.completed) then
    for tp in select * from task_projects where task_id = new.id loop
      for r in
        select * from automation_rules
        where project_id = tp.project_id and enabled = true and trigger_type = 'task_completed'
      loop
        if r.action_type = 'move_to_section' then
          update task_projects set section_id = (r.action_config->>'section_id')::uuid
          where task_id = new.id and project_id = tp.project_id;
        elsif r.action_type = 'notify_user' then
          insert into notifications (user_id, type, task_id, message)
          values ((r.action_config->>'user_id')::uuid, 'completed', new.id, new.name);
        elsif r.action_type = 'add_tag' then
          insert into task_tags (task_id, tag_id) values (new.id, (r.action_config->>'tag_id')::uuid)
          on conflict do nothing;
        end if;
      end loop;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_completed_automations on tasks;
create trigger trg_task_completed_automations
  after update of completed on tasks
  for each row execute function apply_task_completed_automations();

alter function apply_task_section_automations() set search_path = public, pg_temp;
alter function apply_task_completed_automations() set search_path = public, pg_temp;
revoke execute on function apply_task_section_automations() from public, anon, authenticated;
revoke execute on function apply_task_completed_automations() from public, anon, authenticated;
