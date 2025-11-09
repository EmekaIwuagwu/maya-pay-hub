// src/services/unifiedSend.service.ts

import { ValidationError } from '../utils/errors';
import { isValidEmail, isValidEthereumAddress, isValidPhoneNumber } from '../utils/validators';
import { formatPhoneNumber } from '../utils/helpers';
import transactionService from './transaction.service';
import emailPaymentService from './emailPayment.service';
import phonePaymentService from './phonePayment.service';
import { logger } from '../utils/logger';

interface UnifiedSendParams {
  userId: string;
  recipient: string; // Can be email, phone, or wallet address
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}

interface UnifiedSendResult {
  type: 'WALLET' | 'EMAIL' | 'PHONE';
  success: true;
  data: any;
  message: string;
}

class UnifiedSendService {
  /**
   * Detect recipient type and send payment accordingly
   */
  async send(params: UnifiedSendParams): Promise<UnifiedSendResult> {
    const { userId, recipient, amount, personalMessage, referenceNote, expirationDays } = params;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError('Invalid amount');
    }

    // Detect recipient type and route accordingly
    const recipientType = this.detectRecipientType(recipient);

    logger.info(`Unified send: ${recipientType} to ${recipient} for ${amount} USDC`);

    switch (recipientType) {
      case 'WALLET':
        return await this.sendToWallet(userId, recipient, amount, referenceNote);

      case 'EMAIL':
        return await this.sendToEmail(
          userId,
          recipient,
          amount,
          personalMessage,
          referenceNote,
          expirationDays
        );

      case 'PHONE':
        return await this.sendToPhone(
          userId,
          recipient,
          amount,
          personalMessage,
          referenceNote,
          expirationDays
        );

      default:
        throw new ValidationError(
          'Invalid recipient. Please provide a valid wallet address, email, or phone number.'
        );
    }
  }

  /**
   * Detect the type of recipient (wallet address, email, or phone number)
   */
  private detectRecipientType(recipient: string): 'WALLET' | 'EMAIL' | 'PHONE' | 'UNKNOWN' {
    // Clean up recipient
    const cleaned = recipient.trim();

    // Check if it's an Ethereum address (starts with 0x and is 42 characters)
    if (isValidEthereumAddress(cleaned)) {
      return 'WALLET';
    }

    // Check if it's an email address
    if (isValidEmail(cleaned)) {
      return 'EMAIL';
    }

    // Check if it's a phone number
    // Try to format it first
    try {
      const formatted = formatPhoneNumber(cleaned);
      if (isValidPhoneNumber(formatted)) {
        return 'PHONE';
      }
    } catch (error) {
      // Not a valid phone number
    }

    return 'UNKNOWN';
  }

  /**
   * Send to wallet address (direct blockchain transaction)
   */
  private async sendToWallet(
    userId: string,
    walletAddress: string,
    amount: string,
    referenceNote?: string
  ): Promise<UnifiedSendResult> {
    const transaction = await transactionService.sendTransaction({
      userId,
      recipientAddress: walletAddress,
      amount,
      note: referenceNote,
    });

    return {
      type: 'WALLET',
      success: true,
      data: {
        transaction,
        recipientAddress: walletAddress,
      },
      message: `Sent ${amount} USDC to wallet ${walletAddress}`,
    };
  }

  /**
   * Send to email (escrow with email notification)
   */
  private async sendToEmail(
    userId: string,
    email: string,
    amount: string,
    personalMessage?: string,
    referenceNote?: string,
    expirationDays?: number
  ): Promise<UnifiedSendResult> {
    const result = await emailPaymentService.sendEmailPayment({
      userId,
      recipientEmail: email,
      amount,
      personalMessage,
      referenceNote,
      expirationDays,
    });

    return {
      type: 'EMAIL',
      success: true,
      data: {
        emailPayment: result.emailPayment,
        transaction: result.transaction,
        trackingId: result.trackingId,
      },
      message: `Sent ${amount} USDC to ${email}. Email notification sent with claim link.`,
    };
  }

  /**
   * Send to phone number (escrow with SMS notification)
   */
  private async sendToPhone(
    userId: string,
    phone: string,
    amount: string,
    personalMessage?: string,
    referenceNote?: string,
    expirationDays?: number
  ): Promise<UnifiedSendResult> {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    const result = await phonePaymentService.sendPhonePayment({
      userId,
      recipientPhone: formattedPhone,
      amount,
      personalMessage,
      referenceNote,
      expirationDays,
    });

    return {
      type: 'PHONE',
      success: true,
      data: {
        phonePayment: result.phonePayment,
        transaction: result.transaction,
        trackingId: result.trackingId,
        claimUrl: result.claimUrl,
      },
      message: `Sent ${amount} USDC to ${formattedPhone}. SMS notification sent with claim link.`,
    };
  }

  /**
   * Preview send (detect type without actually sending)
   */
  async previewSend(recipient: string): Promise<{
    type: 'WALLET' | 'EMAIL' | 'PHONE' | 'UNKNOWN';
    valid: boolean;
    formattedRecipient?: string;
    message: string;
  }> {
    const recipientType = this.detectRecipientType(recipient);

    switch (recipientType) {
      case 'WALLET':
        return {
          type: 'WALLET',
          valid: true,
          formattedRecipient: recipient,
          message: 'Direct blockchain transfer to wallet address',
        };

      case 'EMAIL':
        return {
          type: 'EMAIL',
          valid: true,
          formattedRecipient: recipient.toLowerCase(),
          message: 'Payment will be sent via email with claim link',
        };

      case 'PHONE':
        const formatted = formatPhoneNumber(recipient);
        return {
          type: 'PHONE',
          valid: true,
          formattedRecipient: formatted,
          message: 'Payment will be sent via SMS with claim link',
        };

      default:
        return {
          type: 'UNKNOWN',
          valid: false,
          message: 'Invalid recipient. Must be a wallet address, email, or phone number.',
        };
    }
  }
}

export default new UnifiedSendService();
