import { env } from "../../config/env.js";
import { mockEmailProvider } from "./mockProvider.js";
import { SmtpEmailProvider } from "./smtpProvider.js";
import { SendgridEmailProvider } from "./sendgridProvider.js";
import { SesEmailProvider } from "./sesProvider.js";
import { GraphEmailProvider } from "./graphProvider.js";
import type { EmailProvider } from "./types.js";

function buildProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "smtp":
      return new SmtpEmailProvider();
    case "sendgrid":
      return new SendgridEmailProvider();
    case "ses":
      return new SesEmailProvider();
    case "graph":
      return new GraphEmailProvider();
    case "mock":
    default:
      return mockEmailProvider;
  }
}

export const emailProvider: EmailProvider = buildProvider();
export * from "./types.js";
