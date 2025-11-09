// src/services/email.service.ts

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Initialize SendGrid
if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

// Initialize nodemailer as fallback
const transporter = nodemailer.createTransporter({
  host: config.email.host,
  port: config.email.port,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: any;
  from?: string;
  trackingId?: string;
}

class EmailService {
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  /**
   * Load and compile email template
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'templates',
        'emails',
        `${templateName}.hbs`
      );

      if (!fs.existsSync(templatePath)) {
        logger.warn(`Template not found: ${templateName}`);
        // Return basic template
        return handlebars.compile('<div>{{message}}</div>');
      }

      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const compiled = handlebars.compile(templateContent);

      // Cache template
      this.templates.set(templateName, compiled);

      return compiled;
    } catch (error) {
      logger.error(`Error loading template ${templateName}:`, error);
      // Return basic fallback template
      return handlebars.compile('<div>{{message}}</div>');
    }
  }

  /**
   * Send email via SendGrid or nodemailer
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { to, subject, template, context, from, trackingId } = options;

      // Load and compile template
      const templateFn = await this.loadTemplate(template);
      const html = templateFn(context);

      // Add tracking pixel if tracking ID provided
      let finalHtml = html;
      if (trackingId && config.emailPayments.trackingEnabled) {
        const trackingPixel = `<img src="${config.apiUrl}/api/payments/track/${trackingId}/opened" width="1" height="1" alt="" />`;
        finalHtml = html + trackingPixel;
      }

      const emailData = {
        to,
        from: from || config.email.from,
        subject,
        html: finalHtml,
      };

      // Try SendGrid first
      if (config.sendgrid.apiKey) {
        await sgMail.send(emailData);
        logger.info(`Email sent via SendGrid to ${to}`);
        return true;
      }

      // Fallback to nodemailer
      await transporter.sendMail(emailData);
      logger.info(`Email sent via nodemailer to ${to}`);
      return true;
    } catch (error: any) {
      logger.error('Error sending email:', error.response?.body || error.message);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string, smartAccountAddress: string) {
    return await this.sendEmail({
      to,
      subject: 'Welcome to Maya Pay!',
      template: 'welcome',
      context: {
        name: name || 'there',
        smartAccountAddress,
        dashboardUrl: config.frontendUrl,
      },
    });
  }

  /**
   * Send email payment notification
   */
  async sendEmailPaymentNotification(params: {
    to: string;
    senderName: string;
    amount: string;
    message?: string;
    claimUrl: string;
    trackingId: string;
    expiresAt: Date;
  }) {
    const { to, senderName, amount, message, claimUrl, trackingId, expiresAt } = params;

    return await this.sendEmail({
      to,
      subject: `${senderName} sent you ${amount} USDC`,
      template: 'paymentWaiting',
      context: {
        senderName,
        amount,
        personalMessage: message,
        claimUrl,
        expiresAt: expiresAt.toLocaleDateString(),
      },
      trackingId,
    });
  }

  /**
   * Send payment claimed notification
   */
  async sendPaymentClaimedNotification(to: string, recipientEmail: string, amount: string) {
    return await this.sendEmail({
      to,
      subject: 'Your payment has been claimed',
      template: 'paymentClaimed',
      context: {
        recipientEmail,
        amount,
      },
    });
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceivedNotification(to: string, senderName: string, amount: string) {
    return await this.sendEmail({
      to,
      subject: 'Payment received',
      template: 'paymentReceived',
      context: {
        senderName,
        amount,
        dashboardUrl: config.frontendUrl,
      },
    });
  }

  /**
   * Send claim reminder
   */
  async sendClaimReminder(to: string, senderName: string, amount: string, claimUrl: string, daysLeft: number) {
    return await this.sendEmail({
      to,
      subject: `Reminder: Claim your ${amount} USDC from ${senderName}`,
      template: 'claimReminder',
      context: {
        senderName,
        amount,
        claimUrl,
        daysLeft,
      },
    });
  }

  /**
   * Send payment expiring notification
   */
  async sendPaymentExpiringNotification(to: string, amount: string, daysLeft: number) {
    return await this.sendEmail({
      to,
      subject: `Your payment of ${amount} USDC is expiring soon`,
      template: 'paymentExpiring',
      context: {
        amount,
        daysLeft,
      },
    });
  }

  /**
   * Send payment refunded notification
   */
  async sendPaymentRefundedNotification(to: string, amount: string, reason: string) {
    return await this.sendEmail({
      to,
      subject: 'Payment refunded',
      template: 'paymentRefunded',
      context: {
        amount,
        reason,
      },
    });
  }

  /**
   * Send transaction confirmation
   */
  async sendTransactionConfirmation(to: string, params: {
    amount: string;
    recipient: string;
    transactionHash: string;
    explorerUrl: string;
  }) {
    return await this.sendEmail({
      to,
      subject: 'Transaction confirmed',
      template: 'paymentSent',
      context: {
        amount: params.amount,
        recipient: params.recipient,
        transactionHash: params.transactionHash,
        explorerUrl: params.explorerUrl,
      },
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(to: string): Promise<boolean> {
    try {
      return await this.sendEmail({
        to,
        subject: 'Maya Pay - Test Email',
        template: 'welcome',
        context: {
          name: 'Test User',
          smartAccountAddress: '0x0000000000000000000000000000000000000000',
          dashboardUrl: config.frontendUrl,
        },
      });
    } catch (error) {
      logger.error('Email test failed:', error);
      return false;
    }
  }
}

export default new EmailService();
