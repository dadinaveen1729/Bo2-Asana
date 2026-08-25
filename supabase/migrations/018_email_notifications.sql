create extension if not exists pg_net with schema extensions;

-- Fires an outbound webhook (async, via pg_net, non-blocking) for the
-- notification types worth interrupting someone's inbox for. Lower-signal/
-- high-frequency types (due_soon, completed, status_change) stay in-app
-- only. The shared secret authenticating the webhook lives in Supabase
-- Vault (see the "notify_webhook_secret" entry) rather than as a literal
-- in this file, since this repo is public.
create or replace function notify_email_webhook()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  recipient record;
  actor_name text;
  webhook_secret text;
begin
  if new.type not in ('assigned', 'mentioned', 'comment', 'added_to_project', 'dependency_cleared') then
    return new;
  end if;

  select email, full_name into recipient from profiles where id = new.user_id;
  if recipient.email is null then
    return new;
  end if;

  if new.actor_id is not null then
    select coalesce(full_name, email) into actor_name from profiles where id = new.actor_id;
  else
    actor_name := 'Someone';
  end if;

  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'notify_webhook_secret';
  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bo2-asana.vercel.app/api/notifications/email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret),
    body := jsonb_build_object(
      'recipientEmail', recipient.email,
      'recipientName', coalesce(recipient.full_name, recipient.email),
      'actorName', actor_name,
      'type', new.type,
      'message', new.message,
      'taskId', new.task_id
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_email on notifications;
create trigger trg_notify_email after insert on notifications
for each row execute function notify_email_webhook();
