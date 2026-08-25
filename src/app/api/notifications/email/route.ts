import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const APP_URL = 'https://bo2-asana.vercel.app';

const SUBJECT_BY_TYPE: Record<string, (actor: string) => string> = {
  assigned: (a) => `${a} assigned you a task`,
  mentioned: (a) => `${a} mentioned you`,
  comment: (a) => `${a} commented on your task`,
  added_to_project: (a) => `${a} added you to a project`,
  dependency_cleared: () => 'A task you were waiting on is done',
};

export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { recipientEmail, recipientName, actorName, type, message, taskId } = await req.json();
  if (!recipientEmail) {
    return NextResponse.json({ error: 'Missing recipientEmail' }, { status: 400 });
  }

  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASSWORD;
  if (!user || !pass) {
    return NextResponse.json({ error: 'Email is not configured (missing BREVO_SMTP_USER/BREVO_SMTP_PASSWORD).' }, { status: 500 });
  }

  const subjectFn = SUBJECT_BY_TYPE[type] || (() => 'You have a new update in BoostFlow');
  const subject = subjectFn(actorName || 'Someone');
  const link = taskId ? `${APP_URL}/tasks/${taskId}` : APP_URL;

  try {
    const transporter = nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } });
    await transporter.sendMail({
      from: '"BoostFlow" <notifications@boostoxygen.com>',
      to: recipientEmail,
      subject,
      text: `Hi ${recipientName || ''},\n\n${subject}.\n\n${message || ''}\n\nOpen it: ${link}\n\n— BoostFlow`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 15px; color: #101828;">Hi ${recipientName || ''},</p>
          <p style="font-size: 15px; color: #101828;"><strong>${subject}</strong></p>
          ${message ? `<p style="font-size: 14px; color: #667085; padding: 12px; background: #F9FAFB; border-radius: 8px;">${message}</p>` : ''}
          <a href="${link}" style="display: inline-block; margin-top: 12px; padding: 10px 18px; background: #FC636B; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Open in BoostFlow</a>
        </div>
      `,
    });
    return NextResponse.json({ sent: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send email.' }, { status: 500 });
  }
}
