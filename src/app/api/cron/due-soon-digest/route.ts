import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOverdue } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_URL = 'https://bo2-asana.vercel.app';
// Matches isDueSoon() in lib/utils.ts (today, +1, +2 days) so the digest
// agrees with what the app itself calls "due soon" everywhere else.
const WINDOW_DAYS = 2;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function windowEnd() {
  const d = new Date();
  d.setDate(d.getDate() + WINDOW_DAYS);
  return isoDate(d);
}

type DigestTask = { id: string; name: string; due_date: string };

// A little personality on the daily nag email so it doesn't read like a
// cron job wagging its finger at you. Picks a line based on whether
// there's anything actually overdue, so it doesn't crack a joke while
// also telling you you're behind.
const OVERDUE_FOOTERS = [
  "No judgment here. Okay, maybe a little.",
  "The tasks aren't going anywhere. Unfortunately.",
  "Past due, not past caring (probably).",
];
const ON_TRACK_FOOTERS = [
  'Just a friendly nudge, not a fire drill.',
  "You've got this. Deep breath, then go breathe some real air.",
  'Sent with 100% more oxygen than the average reminder.',
];
function randomFooter(hasOverdue: boolean) {
  const pool = hasOverdue ? OVERDUE_FOOTERS : ON_TRACK_FOOTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderTaskRow(t: DigestTask) {
  return `<a href="${APP_URL}/tasks/${t.id}" style="display: block; padding: 10px 12px; margin-bottom: 6px; background: #F9FAFB; border-radius: 8px; color: #101828; text-decoration: none; font-size: 14px;">
    <strong>${t.name}</strong>
    <span style="color: #667085; float: right;">${t.due_date}</span>
  </a>`;
}

// Vercel Cron GETs this daily (see vercel.json). It fans one summary email
// out per person instead of the per-task 'due_soon' notification type,
// which stays in-app only -- see 018_email_notifications.sql for why that
// one is excluded from the per-row email trigger (it'd flood inboxes).
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ error: 'Email is not configured (missing BREVO_SMTP_USER/BREVO_SMTP_PASSWORD).' }, { status: 500 });
  }

  const admin = createAdminClient();

  const { data: tasks, error: tasksError } = await admin
    .from('tasks')
    .select('id, name, due_date, assignee_id')
    .eq('completed', false)
    .not('assignee_id', 'is', null)
    .not('due_date', 'is', null)
    .lte('due_date', windowEnd())
    .order('due_date', { ascending: true });

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }
  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0, users: 0 });
  }

  const assigneeIds = Array.from(new Set(tasks.map((t) => t.assignee_id as string)));
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', assigneeIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]));
  const byAssignee = new Map<string, DigestTask[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = byAssignee.get(task.assignee_id as string) || [];
    list.push({ id: task.id, name: task.name, due_date: task.due_date });
    byAssignee.set(task.assignee_id as string, list);
  }

  const transporter = nodemailer.createTransport({ host, port, secure: false, auth: { user: smtpUser, pass: smtpPass } });

  let sent = 0;
  const failures: string[] = [];

  for (const [assigneeId, userTasks] of byAssignee) {
    const profile = profileById.get(assigneeId);
    if (!profile?.email) continue;

    const overdue = userTasks.filter((t) => isOverdue(t.due_date, false));
    const dueSoon = userTasks.filter((t) => !isOverdue(t.due_date, false));

    const subject =
      overdue.length && dueSoon.length
        ? `${overdue.length} overdue, ${dueSoon.length} due soon in Boost Hub`
        : overdue.length
          ? `${overdue.length} task${overdue.length > 1 ? 's' : ''} overdue in Boost Hub`
          : `${dueSoon.length} task${dueSoon.length > 1 ? 's' : ''} due soon in Boost Hub`;

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 15px; color: #101828;">Hi ${profile.full_name || profile.email},</p>
        <p style="font-size: 15px; color: #101828;"><strong>${subject}</strong></p>
        ${overdue.length ? `<p style="font-size: 13px; font-weight: 600; color: #D92D20; margin: 16px 0 6px;">Overdue</p>${overdue.map(renderTaskRow).join('')}` : ''}
        ${dueSoon.length ? `<p style="font-size: 13px; font-weight: 600; color: #667085; margin: 16px 0 6px;">Due soon</p>${dueSoon.map(renderTaskRow).join('')}` : ''}
        <a href="${APP_URL}/my-tasks" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #FC636B; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Open My Tasks</a>
        <p style="margin-top: 20px; font-size: 12px; color: #98A2B3;">${randomFooter(overdue.length > 0)}</p>
      </div>
    `;
    const text = `Hi ${profile.full_name || profile.email},\n\n${subject}\n\n${userTasks
      .map((t) => `- ${t.name} (due ${t.due_date})`)
      .join('\n')}\n\nOpen My Tasks: ${APP_URL}/my-tasks\n\n${randomFooter(overdue.length > 0)}\n\n— Boost Hub`;

    try {
      await transporter.sendMail({
        // See src/app/api/notifications/email/route.ts -- the only sender
        // verified on this Brevo account is boostoxygen30@gmail.com.
        from: '"Boost Hub" <boostoxygen30@gmail.com>',
        to: profile.email,
        subject,
        text,
        html,
      });
      sent++;
    } catch (err: any) {
      failures.push(`${profile.email}: ${err.message}`);
    }
  }

  return NextResponse.json({ sent, users: byAssignee.size, failures });
}
