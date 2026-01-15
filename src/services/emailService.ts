/**
 * Email Service supporting Resend API and Nodemailer SMTP
 * A generic, reusable email service for the app framework.
 * Resend is preferred when API key is configured.
 */

import { EventEmitter } from "events";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";
import { createLogger } from "../core/index.js";

let logger: ReturnType<typeof createLogger>;

function ensureLogger() {
  if (!logger) {
    logger = createLogger("EmailService");
  }
  return logger;
}

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export interface EmailConfig {
  enabled?: boolean;
  provider?: "resend" | "smtp";
  resend?: {
    apiKey: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
  from?: string;
  to?: string[];
  appName?: string;
  appTitle?: string;
  logoUrl?: string;
  brandColor?: string;
  footerText?: string;
  footerLink?: string;
}

export type NotificationEventType =
  | "startup"
  | "shutdown"
  | "error"
  | "warning"
  | "info"
  | "success"
  | "custom";

export interface NotificationEvent {
  type: NotificationEventType;
  title?: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface EmailServiceStatus {
  enabled: boolean;
  provider: "Resend" | "SMTP" | "None";
  recipients: string[];
}

// ============================================================================
// Email Service
// ============================================================================

export class EmailService extends EventEmitter {
  private transporter?: Transporter;
  private resend?: Resend;
  private enabled: boolean = false;
  private useResend: boolean = false;
  private notificationQueue: NotificationEvent[] = [];
  private processingInterval?: NodeJS.Timeout;
  private fromAddress: string = "App <noreply@example.com>";
  private defaultRecipients: string[] = [];
  private config: EmailConfig;

  // Branding configuration
  private appName: string = "App";
  private appTitle: string = "App";
  private logoUrl?: string;
  private brandColor: string = "#6c5ce7";
  private footerText?: string;
  private footerLink?: string;

  constructor(config: EmailConfig = {}) {
    super();
    this.config = config;
    this.enabled = config.enabled ?? false;
    this.defaultRecipients = config.to || [];
    this.fromAddress = config.from || this.fromAddress;
    this.appName = config.appName || this.appName;
    this.appTitle = config.appTitle || config.appName || this.appTitle;
    this.logoUrl = config.logoUrl;
    this.brandColor = config.brandColor || this.brandColor;
    this.footerText = config.footerText;
    this.footerLink = config.footerLink;

    ensureLogger().debug("EmailService created", {
      enabled: this.enabled,
      provider: config.provider,
    });
  }

  /**
   * Initialize the email service
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      ensureLogger().info("Email service disabled in configuration");
      return;
    }

    // Try Resend first (preferred)
    const resendApiKey =
      this.config.resend?.apiKey || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        this.resend = new Resend(resendApiKey);
        this.useResend = true;
        ensureLogger().info("Email service initialized with Resend API");
        this.startNotificationProcessor();
        this.emit("initialized", { provider: "Resend" });
        return;
      } catch (error) {
        ensureLogger().warn(
          "Failed to initialize Resend, falling back to SMTP:",
          error,
        );
      }
    }

    // Fall back to SMTP/Nodemailer
    if (!this.config.smtp) {
      ensureLogger().warn(
        "No email provider configured (no Resend API key or SMTP config)",
      );
      this.enabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.auth
          ? {
              user: this.config.smtp.auth.user,
              pass: this.config.smtp.auth.pass,
            }
          : undefined,
      });

      await this.transporter.verify();
      ensureLogger().info("Email service initialized with SMTP");
      this.startNotificationProcessor();
      this.emit("initialized", { provider: "SMTP" });
    } catch (error) {
      ensureLogger().error("Failed to initialize email service:", error);
      this.enabled = false;
    }
  }

  /**
   * Update branding configuration
   */
  setBranding(options: {
    appName?: string;
    appTitle?: string;
    logoUrl?: string;
    brandColor?: string;
    footerText?: string;
    footerLink?: string;
  }): void {
    if (options.appName) this.appName = options.appName;
    if (options.appTitle) this.appTitle = options.appTitle;
    if (options.logoUrl) this.logoUrl = options.logoUrl;
    if (options.brandColor) this.brandColor = options.brandColor;
    if (options.footerText) this.footerText = options.footerText;
    if (options.footerLink) this.footerLink = options.footerLink;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      ensureLogger().debug("Email service not available, skipping email");
      return;
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const toAddresses =
      recipients.length > 0 ? recipients : this.defaultRecipients;

    if (toAddresses.length === 0) {
      ensureLogger().warn("No email recipients configured");
      return;
    }

    try {
      if (this.useResend && this.resend) {
        const { data, error } = await this.resend.emails.send({
          from: this.fromAddress,
          to: toAddresses,
          subject: options.subject,
          text: options.text || "No content",
          html: options.html,
        });

        if (error) {
          throw new Error(error.message);
        }

        ensureLogger().info(`Email sent via Resend: ${data?.id}`);
        this.emit("sent", { id: data?.id, provider: "Resend" });
      } else if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to: toAddresses.join(", "),
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
        });

        ensureLogger().info(`Email sent via SMTP: ${info.messageId}`);
        this.emit("sent", { id: info.messageId, provider: "SMTP" });
      }
    } catch (error) {
      ensureLogger().error("Failed to send email:", error);
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Queue a notification event
   */
  queueNotification(event: NotificationEvent): void {
    if (!this.enabled) {
      return;
    }

    this.notificationQueue.push(event);
    ensureLogger().debug(`Queued ${event.type} notification`);
    this.emit("queued", event);
  }

  /**
   * Send immediate notification (bypasses queue)
   */
  async sendImmediateNotification(event: NotificationEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.sendNotificationEmail(event.type, [event]);
      ensureLogger().info(`Sent immediate ${event.type} notification`);
    } catch (error) {
      ensureLogger().error(
        `Failed to send immediate ${event.type} notification:`,
        error,
      );
    }
  }

  /**
   * Send a notification with custom type and data
   */
  async notify(
    type: NotificationEventType,
    title: string,
    data: Record<string, unknown>,
    immediate: boolean = true,
  ): Promise<void> {
    const event: NotificationEvent = {
      type,
      title,
      data,
      timestamp: new Date(),
    };

    if (immediate) {
      await this.sendImmediateNotification(event);
    } else {
      this.queueNotification(event);
    }
  }

  /**
   * Send startup notification
   */
  async notifyStartup(
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const uptime = process.uptime();
    const nodeVersion = process.version;
    const platform = process.platform;

    await this.sendImmediateNotification({
      type: "startup",
      title: "Application Started",
      data: {
        nodeVersion,
        platform,
        startupTime: `${uptime.toFixed(2)}s`,
        timestamp: new Date().toISOString(),
        ...data,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Send error notification
   */
  async notifyError(
    errorMessage: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.sendImmediateNotification({
      type: "error",
      title: "Error Alert",
      data: {
        errorMessage,
        ...details,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Send test email
   */
  async sendTestEmail(): Promise<void> {
    const provider = this.useResend ? "Resend API" : "SMTP";

    await this.sendEmail({
      to: this.defaultRecipients,
      subject: `[${this.appTitle}] Test Email - Configuration Verified`,
      text: `This is a test email from ${this.appTitle}.\n\nEmail Provider: ${provider}\n\nIf you received this email, your email configuration is working correctly.`,
      html: this.generateTestEmailHtml(provider),
    });
  }

  /**
   * Get service status
   */
  getStatus(): EmailServiceStatus {
    return {
      enabled: this.enabled,
      provider: this.useResend ? "Resend" : this.transporter ? "SMTP" : "None",
      recipients: this.defaultRecipients,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    if (this.notificationQueue.length > 0) {
      await this.processNotificationQueue();
    }

    if (this.transporter) {
      this.transporter.close();
    }

    ensureLogger().info("Email service shut down");
    this.emit("shutdown");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startNotificationProcessor(): void {
    // Process queue every 5 minutes
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 300000);
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) {
      return;
    }

    const grouped = this.groupNotificationsByType();

    for (const [type, events] of Object.entries(grouped)) {
      try {
        await this.sendNotificationEmail(type as NotificationEventType, events);
      } catch (error) {
        ensureLogger().error(`Failed to send ${type} notification:`, error);
      }
    }

    this.notificationQueue = [];
  }

  private groupNotificationsByType(): Record<string, NotificationEvent[]> {
    const grouped: Record<string, NotificationEvent[]> = {};

    for (const event of this.notificationQueue) {
      if (!grouped[event.type]) {
        grouped[event.type] = [];
      }
      grouped[event.type].push(event);
    }

    return grouped;
  }

  private async sendNotificationEmail(
    type: NotificationEventType,
    events: NotificationEvent[],
  ): Promise<void> {
    const subject = this.getNotificationSubject(type, events);
    const html = this.formatNotificationHtml(type, events);
    const text = this.formatNotificationText(type, events);

    await this.sendEmail({
      to: this.defaultRecipients,
      subject,
      text,
      html,
    });
  }

  private getNotificationSubject(
    type: NotificationEventType,
    events: NotificationEvent[],
  ): string {
    const count = events.length;
    const customTitle = events[0]?.title;

    switch (type) {
      case "startup":
        return `[${this.appTitle}] Application Started`;
      case "shutdown":
        return `[${this.appTitle}] Application Shutdown`;
      case "error":
        return `[${this.appTitle}] Error Alert${count > 1 ? ` (${count})` : ""}`;
      case "warning":
        return `[${this.appTitle}] Warning${count > 1 ? ` (${count})` : ""}`;
      case "info":
        return `[${this.appTitle}] Information`;
      case "success":
        return `[${this.appTitle}] Success`;
      case "custom":
        return customTitle
          ? `[${this.appTitle}] ${customTitle}`
          : `[${this.appTitle}] Notification`;
      default:
        return `[${this.appTitle}] Notification`;
    }
  }

  private getNotificationIcon(type: NotificationEventType): string {
    switch (type) {
      case "startup":
        return "🚀";
      case "shutdown":
        return "🛑";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      case "success":
        return "✅";
      case "custom":
        return "📧";
      default:
        return "📧";
    }
  }

  private getAccentColor(type: NotificationEventType): string {
    switch (type) {
      case "error":
        return "#e74c3c";
      case "warning":
        return "#f39c12";
      case "success":
        return "#27ae60";
      case "startup":
        return "#3498db";
      case "shutdown":
        return "#95a5a6";
      default:
        return this.brandColor;
    }
  }

  private formatDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private formatEventDataHtml(data: Record<string, unknown>): string {
    if (!data || typeof data !== "object") {
      return `<tr><td colspan="2">${data || "No details"}</td></tr>`;
    }

    const formatValue = (val: unknown): string => {
      if (val instanceof Date) return this.formatDateTime(val);
      if (typeof val === "object") return JSON.stringify(val);
      return String(val ?? "-");
    };

    return Object.entries(data)
      .map(([key, val]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase());
        return `<tr><td style="font-weight:600;color:#495057;padding:4px 8px;">${label}:</td><td style="padding:4px 8px;">${formatValue(val)}</td></tr>`;
      })
      .join("");
  }

  private formatNotificationHtml(
    type: NotificationEventType,
    events: NotificationEvent[],
  ): string {
    const accentColor = this.getAccentColor(type);
    const icon = this.getNotificationIcon(type);
    const title = events[0]?.title || this.getNotificationTitle(type);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.getNotificationSubject(type, events)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${this.logoUrl ? `<img src="${this.logoUrl}" alt="${this.appName}" width="150" style="display: block; border: 0;" />` : `<span style="font-size: 24px; font-weight: 700; color: ${this.brandColor};">${this.appName}</span>`}
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">${this.appTitle}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 32px 40px;">
              <!-- Title section -->
              <div style="margin-bottom: 24px;">
                <span style="font-size: 32px; margin-right: 12px;">${icon}</span>
                <h1 style="display: inline; font-size: 24px; font-weight: 600; color: #2d3436; margin: 0; vertical-align: middle;">${title}</h1>
              </div>

              <!-- Status badge -->
              <div style="margin-bottom: 24px;">
                <span style="display: inline-block; background-color: ${accentColor}15; color: ${accentColor}; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${type.replace(/_/g, " ")}
                </span>
              </div>
`;

    for (const event of events) {
      html += `
              <!-- Event content -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #6c757d; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${this.formatDateTime(event.timestamp)}
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${this.formatEventDataHtml(event.data)}
                </table>
              </div>
      `;
    }

    html += `
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 12px; color: #6c757d; line-height: 1.5;">
                This is an automated notification from ${this.appTitle}.${this.footerText ? `<br>${this.footerText}` : ""}${this.footerLink ? `<br><a href="${this.footerLink}" style="color: ${this.brandColor}; text-decoration: none;">${this.footerLink}</a>` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    return html;
  }

  private formatNotificationText(
    type: NotificationEventType,
    events: NotificationEvent[],
  ): string {
    const timestamp = this.formatDateTime(new Date());
    const title = events[0]?.title || this.getNotificationTitle(type);

    let text = `${this.appTitle} - ${title}\n`;
    text += `Generated: ${timestamp}\n`;
    text += "=".repeat(60) + "\n\n";

    for (const event of events) {
      text += `Time: ${this.formatDateTime(event.timestamp)}\n`;
      text += `Details:\n${this.formatEventDataText(event.data)}\n`;
      text += "-".repeat(40) + "\n\n";
    }

    text += `This is an automated notification from ${this.appTitle}.\n`;
    if (this.footerText) text += `${this.footerText}\n`;

    return text;
  }

  private formatEventDataText(data: Record<string, unknown>): string {
    if (!data || typeof data !== "object") {
      return String(data || "No details");
    }

    const formatValue = (val: unknown): string => {
      if (val instanceof Date) return this.formatDateTime(val);
      if (typeof val === "object") return JSON.stringify(val);
      return String(val ?? "-");
    };

    return Object.entries(data)
      .map(([key, val]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase());
        return `  ${label}: ${formatValue(val)}`;
      })
      .join("\n");
  }

  private getNotificationTitle(type: NotificationEventType): string {
    switch (type) {
      case "startup":
        return "Application Started";
      case "shutdown":
        return "Application Shutdown";
      case "error":
        return "Error Alert";
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      case "success":
        return "Success";
      case "custom":
        return "Notification";
      default:
        return "Notification";
    }
  }

  private generateTestEmailHtml(provider: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Configuration Verified</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${this.logoUrl ? `<img src="${this.logoUrl}" alt="${this.appName}" width="150" style="display: block; border: 0;" />` : `<span style="font-size: 24px; font-weight: 700; color: ${this.brandColor};">${this.appName}</span>`}
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">${this.appTitle}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              <div style="width: 64px; height: 64px; background-color: #d4edda; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px; line-height: 64px;">✅</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 600; color: #2d3436; margin: 0 0 16px 0;">Email Configuration Verified</h1>
              <p style="font-size: 16px; color: #6c757d; margin: 0 0 32px 0;">Your email notifications are configured correctly.</p>

              <!-- Info card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: left;">
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef;">
                  <span style="color: #6c757d; font-size: 14px;">Provider</span>
                  <span style="font-weight: 600; color: #2d3436; font-size: 14px;">${provider}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                  <span style="color: #6c757d; font-size: 14px;">App</span>
                  <span style="font-weight: 600; color: #2d3436; font-size: 14px;">${this.appTitle}</span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6c757d; line-height: 1.5;">
                This is an automated test from ${this.appTitle}.${this.footerText ? `<br>${this.footerText}` : ""}${this.footerLink ? `<br><a href="${this.footerLink}" style="color: ${this.brandColor}; text-decoration: none;">${this.footerLink}</a>` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let emailServiceInstance: EmailService | null = null;

/**
 * Get the email service instance (singleton)
 */
export function getEmailService(): EmailService | null {
  return emailServiceInstance;
}

/**
 * Create and initialize the email service
 */
export async function createEmailService(
  config: EmailConfig,
): Promise<EmailService> {
  if (emailServiceInstance) {
    return emailServiceInstance;
  }

  emailServiceInstance = new EmailService(config);
  await emailServiceInstance.initialize();
  return emailServiceInstance;
}

export default EmailService;
