import { env } from "../../config/env.js";
import type { EmailMessage, EmailProvider } from "./types.js";

// Amazon SES provider (@aws-sdk/client-ses is bundled). Set the SES_* env
// vars before selecting EMAIL_PROVIDER=ses in production.
export class SesEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!env.SES_REGION || !env.SES_ACCESS_KEY_ID || !env.SES_SECRET_ACCESS_KEY) {
      throw new Error("SES is selected (EMAIL_PROVIDER=ses) but SES_REGION/SES_ACCESS_KEY_ID/SES_SECRET_ACCESS_KEY are not configured.");
    }
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses").catch(() => {
      throw new Error('The "@aws-sdk/client-ses" package is required for EMAIL_PROVIDER=ses. Install it in apps/api.');
    });
    const client = new SESClient({
      region: env.SES_REGION,
      credentials: { accessKeyId: env.SES_ACCESS_KEY_ID, secretAccessKey: env.SES_SECRET_ACCESS_KEY },
    });
    await client.send(
      new SendEmailCommand({
        Source: env.EMAIL_FROM,
        Destination: { ToAddresses: [message.to] },
        Message: {
          Subject: { Data: message.subject },
          Body: { Text: { Data: message.text }, ...(message.html ? { Html: { Data: message.html } } : {}) },
        },
      })
    );
  }
}
