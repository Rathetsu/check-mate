// P1-AC-07: one sendEmail. SMTP when configured, otherwise the message (with
// its link) goes to the server log for the operator to pass on
// (2026-10-11-03-soft-launch-without-email-service).
import nodemailer, { type Transporter } from 'nodemailer';

export type Email = { to: string; subject: string; text: string };

let transport: Transporter | undefined;

export async function sendEmail(email: Email): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info(
      `[email] SMTP not configured; pass this on by hand.\nTo: ${email.to}\nSubject: ${email.subject}\n${email.text}`,
    );
    return;
  }
  transport ??= nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM ?? 'CheckMate <no-reply@checkmate.local>', ...email });
}
