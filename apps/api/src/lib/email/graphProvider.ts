import { env } from "../../config/env.js";
import type { EmailMessage, EmailProvider } from "./types.js";

// Microsoft Graph provider (sends mail as a licensed mailbox via
// /users/{upn}/sendMail, using @azure/msal-node for app-only auth, which
// is bundled). Set the GRAPH_* env vars before selecting
// EMAIL_PROVIDER=graph in production.
export class GraphEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!env.GRAPH_TENANT_ID || !env.GRAPH_CLIENT_ID || !env.GRAPH_CLIENT_SECRET || !env.GRAPH_SENDER_UPN) {
      throw new Error("Microsoft Graph is selected (EMAIL_PROVIDER=graph) but GRAPH_* env vars are not fully configured.");
    }
    const { ConfidentialClientApplication } = await import("@azure/msal-node").catch(() => {
      throw new Error('The "@azure/msal-node" package is required for EMAIL_PROVIDER=graph. Install it in apps/api.');
    });
    const msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: env.GRAPH_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${env.GRAPH_TENANT_ID}`,
        clientSecret: env.GRAPH_CLIENT_SECRET,
      },
    });
    const tokenResponse = await msalApp.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
    if (!tokenResponse?.accessToken) {
      throw new Error("Failed to acquire a Microsoft Graph access token.");
    }
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.GRAPH_SENDER_UPN)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: message.subject,
            body: { contentType: message.html ? "HTML" : "Text", content: message.html ?? message.text },
            toRecipients: [{ emailAddress: { address: message.to } }],
          },
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Microsoft Graph sendMail failed with status ${response.status}`);
    }
  }
}
