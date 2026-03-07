// ─── /lib/sendEmail.js ────────────────────────────────────────────────────────
// Reusable Gmail SMTP mailer using nodemailer.
//
// Required env vars:
//   EMAIL_USER  – Gmail account used for SMTP auth  (e.g. nox.colina@servco.com)
//   EMAIL_PASS  – Gmail App Password (16-char, NOT your Google account password)
//   EMAIL_FROM  – Visible sender address             (e.g. nox.colina@servco.com)
// ─────────────────────────────────────────────────────────────────────────────

import nodemailer from "nodemailer";

/**
 * Send an email via Gmail SMTP.
 * @param {{ to: string|string[], subject: string, text: string, html?: string }} opts
 */
export async function sendEmail({ to, subject, text, html }) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!user || !pass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS environment variables must be configured in Vercel"
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const recipients = Array.isArray(to) ? to.join(", ") : to;

  await transporter.sendMail({
    from:    `Servco Leeward Recon <${from}>`,
    to:      recipients,
    subject,
    text,
    html,
  });
}
