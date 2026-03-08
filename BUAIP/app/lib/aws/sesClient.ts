/**
 * AWS SES Client Wrapper
 * Simple Email Service
 */

import {
  SESClient,
  SendEmailCommand,
  SendBulkTemplatedEmailCommand,
  VerifyEmailIdentityCommand,
  GetAccountSendingEnabledCommand,
  ListVerifiedEmailAddressesCommand,
} from "@aws-sdk/client-ses";
import { awsConfig } from "./config";

export const sesClient = new SESClient({
  region: awsConfig.region,
});

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailContent {
  subject: string;
  htmlBody?: string;
  textBody?: string;
}

export interface BulkEmailTemplate {
  destination: EmailRecipient[];
  data: { [key: string]: string };
}

/**
 * Send email via SES
 */
export async function sendEmail(
  from: EmailRecipient,
  to: EmailRecipient[],
  content: EmailContent,
  cc?: EmailRecipient[],
  bcc?: EmailRecipient[]
): Promise<string> {
  try {
    const command = new SendEmailCommand({
      Source: from.name ? `${from.name} <${from.email}>` : from.email,
      Destination: {
        ToAddresses: to.map((r) => r.email),
        CcAddresses: cc?.map((r) => r.email),
        BccAddresses: bcc?.map((r) => r.email),
      },
      Message: {
        Subject: {
          Data: content.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: content.htmlBody
            ? {
                Data: content.htmlBody,
                Charset: "UTF-8",
              }
            : undefined,
          Text: content.textBody
            ? {
                Data: content.textBody,
                Charset: "UTF-8",
              }
            : undefined,
        },
      },
    });

    const response = await sesClient.send(command);
    return response.MessageId || "";
  } catch (error) {
    console.error("Send email error:", error);
    throw error;
  }
}

/**
 * Send simple email
 */
export async function sendSimpleEmail(
  from: string,
  to: string[],
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<string> {
  return sendEmail(
    { email: from },
    to.map((email) => ({ email })),
    { subject, htmlBody, textBody }
  );
}

/**
 * Send HTML email with InlineImages support
 */
export async function sendHTMLEmail(
  from: string,
  to: string[],
  subject: string,
  htmlBody: string
): Promise<string> {
  return sendSimpleEmail(from, to, subject, htmlBody);
}

/**
 * Verify email address (required before sending in sandbox)
 */
export async function verifyEmailAddress(email: string): Promise<void> {
  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });

    await sesClient.send(command);
  } catch (error) {
    console.error("Verify email address error:", error);
    throw error;
  }
}

/**
 * Check if SES is enabled for account
 */
export async function isEmailSendingEnabled(): Promise<boolean> {
  try {
    const command = new GetAccountSendingEnabledCommand({});

    const response = await sesClient.send(command);
    return response.Enabled || false;
  } catch (error) {
    console.error("Check email sending enabled error:", error);
    throw error;
  }
}

/**
 * Get verified email addresses
 */
export async function getVerifiedEmails(): Promise<string[]> {
  try {
    const command = new ListVerifiedEmailAddressesCommand({});

    const response = await sesClient.send(command);
    return response.VerifiedEmailAddresses || [];
  } catch (error) {
    console.error("Get verified emails error:", error);
    throw error;
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail(
  from: string,
  recipients: Array<{ email: string; subject?: string; htmlBody: string }>,
  defaultSubject: string = "Message"
): Promise<string[]> {
  try {
    const messageIds = await Promise.all(
      recipients.map((recipient) =>
        sendSimpleEmail(
          from,
          [recipient.email],
          recipient.subject || defaultSubject,
          recipient.htmlBody
        )
      )
    );

    return messageIds;
  } catch (error) {
    console.error("Send bulk email error:", error);
    throw error;
  }
}

/**
 * Send email with attachments (requires MIME encoding)
 */
export async function sendEmailWithAttachments(
  from: string,
  to: string[],
  subject: string,
  htmlBody: string,
  attachments: Array<{ filename: string; content: Buffer; contentType: string }>
): Promise<string> {
  try {
    // Note: SES SendEmail doesn't support attachments directly
    // This requires using SendRawEmail with MIME encoding
    // Implementation would need email-mime library
    throw new Error(
      "Attachments require SendRawEmail - not yet implemented. Use SendRawEmailCommand instead."
    );
  } catch (error) {
    console.error("Send email with attachments error:", error);
    throw error;
  }
}

/**
 * Retry mechanism for failed sends
 */
export async function sendEmailWithRetry(
  from: string,
  to: string[],
  subject: string,
  htmlBody: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendSimpleEmail(from, to, subject, htmlBody);
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export default sesClient;
