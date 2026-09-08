import { env } from "../../config/env.js";
import type { EmailMessage, EmailProvider } from "./types.js";

// SMTP provider (nodemailer is bundled). Set the SMTP_* env vars before
// selecting EMAIL_PROVIDER=smtp in production.
export class SmtpEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      throw new Error("SMTP is selected (EMAIL_PROVIDER=smtp) but SMTP_HOST/SMTP_USER/SMTP_PASSWORD are not configured.");
    }
    const nodemailer = await import("nodemailer").catch(() => {
      throw new Error('The "nodemailer" package is required for EMAIL_PROVIDER=smtp. Install it in apps/api.');
    });
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? false,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
    await transport.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
