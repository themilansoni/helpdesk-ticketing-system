import type { EmailMessage, EmailProvider } from "./types.js";

// Default provider for local development and CI: logs the message instead
// of sending it, and keeps an in-memory record so tests can assert on it.
export class MockEmailProvider implements EmailProvider {
  public sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    console.info(`[mock-email] To: ${message.to} | Subject: ${message.subject}`);
  }
}

export const mockEmailProvider = new MockEmailProvider();
