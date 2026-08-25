-- Inviting someone (workspace-level "Invite teammates" or a project's
-- "Share" box) only ever inserted an `invites` row — nothing ever emailed
-- the invitee, so the sign-up link had to be copy-pasted by hand. This
-- mirrors notify_email_webhook (018) but fires off `invites` insert instead
-- of `notifications` insert, reusing the same Brevo relay and the same
-- Vault-held webhook secret.
create or replace function notify_invite_email()
returns trigger language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  inviter_name text;
  workspace_name text;
  webhook_secret text;
begin
  select coalesce(full_name, email) into inviter_name from profiles where id = new.invited_by;
  select name into workspace_name from workspaces where id = new.workspace_id;

  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name = 'notify_webhook_secret';
  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bo2-asana.vercel.app/api/notifications/email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret),
    body := jsonb_build_object(
      'recipientEmail', new.email,
      'recipientName', split_part(new.email, '@', 1),
      'actorName', coalesce(inviter_name, 'Someone'),
      'type', 'invited',
      'message', coalesce(inviter_name, 'Someone') || ' invited you to join ' || coalesce(workspace_name, 'their workspace') || ' on BoostFlow.'
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_invite_email on invites;
create trigger trg_notify_invite_email after insert on invites
for each row execute function notify_invite_email();
