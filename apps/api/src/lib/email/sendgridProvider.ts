import { env } from "../../config/env.js";
import type { EmailMessage, EmailProvider } from "./types.js";

// SendGrid provider (@sendgrid/mail is bundled). Set SENDGRID_API_KEY
// before selecting EMAIL_PROVIDER=sendgrid in production.
export class SendgridEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      throw new Error("SendGrid is selected (EMAIL_PROVIDER=sendgrid) but SENDGRID_API_KEY is not configured.");
    }
    const sgMail = await import("@sendgrid/mail").catch(() => {
      throw new Error('The "@sendgrid/mail" package is required for EMAIL_PROVIDER=sendgrid. Install it in apps/api.');
    });
    sgMail.default.setApiKey(env.SENDGRID_API_KEY);
    await sgMail.default.send({
      to: message.to,
      from: env.EMAIL_FROM,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
