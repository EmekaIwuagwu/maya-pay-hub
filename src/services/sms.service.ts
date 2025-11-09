// src/services/sms.service.ts

import { config } from '../config';
import { logger } from '../utils/logger';

// Twilio client (will be initialized if credentials are provided)
let twilioClient: any = null;

// Initialize Twilio
if (config.twilio?.accountSid && config.twilio?.authToken) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    logger.info('Twilio SMS service initialized');
  } catch (error) {
    logger.warn('Twilio not initialized - SMS features will be disabled');
  }
}

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
  trackingId?: string;
}

class SMSService {
  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add + if not present
    if (!cleaned.startsWith('+')) {
      // Assume US number if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(options: SMSOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!twilioClient) {
        logger.error('Twilio not configured - cannot send SMS');
        return {
          success: false,
          error: 'SMS service not configured',
        };
      }

      const { to, message, from } = options;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(to);

      // Send SMS
      const result = await twilioClient.messages.create({
        body: message,
        to: formattedPhone,
        from: from || config.twilio.phoneNumber,
      });

      logger.info(`SMS sent to ${formattedPhone}, SID: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      logger.error('Error sending SMS:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send phone payment notification
   */
  async sendPhonePaymentNotification(params: {
    to: string;
    senderName: string;
    amount: string;
    message?: string;
    claimUrl: string;
    trackingId: string;
    expiresAt: Date;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, senderName, amount, message: personalMessage, claimUrl, expiresAt } = params;

    // Format expiration date
    const expiryDays = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Construct SMS message
    let smsText = `💰 ${senderName} sent you $${amount} USDC!\n\n`;

    if (personalMessage) {
      smsText += `Message: "${personalMessage}"\n\n`;
    }

    smsText += `Claim your payment here:\n${claimUrl}\n\n`;
    smsText += `Expires in ${expiryDays} days.\n\n`;
    smsText += `Powered by Maya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
      trackingId: params.trackingId,
    });
  }

  /**
   * Send payment claimed notification to sender
   */
  async sendPaymentClaimedNotification(
    to: string,
    recipientPhone: string,
    amount: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `✅ Your payment of $${amount} USDC has been claimed by ${recipientPhone}.\n\nView details: ${config.frontendUrl}/transactions\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceivedNotification(
    to: string,
    senderName: string,
    amount: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `💵 You received $${amount} USDC from ${senderName}!\n\nView your wallet: ${config.frontendUrl}/dashboard\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send claim reminder
   */
  async sendClaimReminder(
    to: string,
    senderName: string,
    amount: string,
    claimUrl: string,
    daysLeft: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `⏰ Reminder: ${senderName} sent you $${amount} USDC.\n\nClaim it before it expires in ${daysLeft} days:\n${claimUrl}\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send payment expiring notification
   */
  async sendPaymentExpiringNotification(
    to: string,
    amount: string,
    daysLeft: number
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `⚠️ Your unclaimed payment of $${amount} USDC expires in ${daysLeft} days!\n\nView: ${config.frontendUrl}/payments\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send payment refunded notification
   */
  async sendPaymentRefundedNotification(
    to: string,
    amount: string,
    reason: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `💰 Your payment of $${amount} USDC has been refunded.\n\nReason: ${reason}\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send transaction confirmation
   */
  async sendTransactionConfirmation(
    to: string,
    params: {
      amount: string;
      recipient: string;
      transactionHash: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `✅ Sent $${params.amount} USDC to ${params.recipient}\n\nTx: ${params.transactionHash.substring(0, 10)}...\n\nMaya Pay`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(
    to: string,
    code: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const smsText = `Your Maya Pay verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.`;

    return await this.sendSMS({
      to,
      message: smsText,
    });
  }

  /**
   * Test SMS configuration
   */
  async testSMSConfig(to: string): Promise<boolean> {
    try {
      const result = await this.sendSMS({
        to,
        message: 'Maya Pay - Test SMS. Your SMS service is configured correctly!',
      });

      return result.success;
    } catch (error) {
      logger.error('SMS test failed:', error);
      return false;
    }
  }

  /**
   * Check if SMS service is available
   */
  isAvailable(): boolean {
    return twilioClient !== null;
  }
}

export default new SMSService();
