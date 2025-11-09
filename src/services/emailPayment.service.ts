// src/services/emailPayment.service.ts

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, PaymentError } from '../utils/errors';
import { isValidEmail } from '../utils/validators';
import { generateTrackingId, addDays } from '../utils/helpers';
import smartAccountService from './smartAccount.service';
import userService from './user.service';
import { config } from '../config';

interface SendEmailPaymentParams {
  userId: string;
  recipientEmail: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}

class EmailPaymentService {
  /**
   * Send payment to email address
   */
  async sendEmailPayment(params: SendEmailPaymentParams) {
    const {
      userId,
      recipientEmail,
      amount,
      personalMessage,
      referenceNote,
      expirationDays = config.emailPayments.expirationDays,
    } = params;

    // Validate email
    if (!isValidEmail(recipientEmail)) {
      throw new ValidationError('Invalid email address');
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError('Invalid amount');
    }

    // Check user limits
    await userService.checkTransactionLimits(userId, amountNum);

    // Get sender
    const sender = await userService.getUserById(userId);

    // Get sender's smart account
    const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);
    if (!smartAccount) {
      throw new NotFoundError('Smart account not found');
    }

    // Check balance
    const balance = await smartAccountService.getSmartAccountBalance(smartAccount.id);
    if (parseFloat(balance.balance) < amountNum) {
      throw new PaymentError('Insufficient balance');
    }

    // Check if recipient already has an account
    const recipient = await userService.getUserByEmail(recipientEmail.toLowerCase());

    // Generate tracking ID
    const trackingId = generateTrackingId();

    // Calculate expiration date
    const expiresAt = addDays(new Date(), expirationDays);

    // Create email payment record
    const emailPayment = await prisma.emailPayment.create({
      data: {
        senderId: userId,
        senderEmail: sender.email,
        recipientEmail: recipientEmail.toLowerCase(),
        recipientId: recipient?.id,
        amount: amountNum,
        currency: 'USDC',
        status: 'PENDING',
        expiresAt,
        emailTrackingId: trackingId,
        personalMessage,
        referenceNote,
        escrowSmartAccountId: smartAccount.id,
      },
    });

    // Update or create pending email payment record
    await prisma.pendingEmailPayment.upsert({
      where: {
        recipientEmail: recipientEmail.toLowerCase(),
      },
      update: {
        totalAmount: {
          increment: amountNum,
        },
        paymentCount: {
          increment: 1,
        },
      },
      create: {
        recipientEmail: recipientEmail.toLowerCase(),
        totalAmount: amountNum,
        paymentCount: 1,
      },
    });

    // Update smart account escrow balance
    await prisma.smartAccount.update({
      where: { id: smartAccount.id },
      data: {
        balanceInEscrow: {
          increment: amountNum,
        },
      },
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        senderId: userId,
        recipientId: recipient?.id,
        recipientEmail: recipientEmail.toLowerCase(),
        amount: amountNum,
        amountUSDC: amountNum,
        fee: 0,
        gasFee: 0,
        totalAmount: amountNum,
        status: 'IN_ESCROW',
        transactionType: 'EMAIL_PAYMENT',
        isEmailPayment: true,
        emailPaymentId: emailPayment.id,
        useEscrow: true,
        referenceNote,
      },
    });

    // Update email payment with transaction
    await prisma.emailPayment.update({
      where: { id: emailPayment.id },
      data: {
        emailSentAt: new Date(), // Will be updated when email is actually sent
      },
    });

    // Log activity
    await userService.logActivity(userId, 'EMAIL_PAYMENT_SENT', {
      emailPaymentId: emailPayment.id,
      recipientEmail,
      amount,
    });

    // Create notification
    await userService.createNotification(userId, {
      type: 'EMAIL_PAYMENT_SENT',
      title: 'Payment Sent',
      message: `Your payment of ${amount} USDC to ${recipientEmail} is waiting to be claimed`,
      actionUrl: `/payments/${emailPayment.id}`,
    });

    logger.info(`Email payment created: ${emailPayment.id} to ${recipientEmail}`);

    return {
      emailPayment,
      transaction,
      trackingId,
    };
  }

  /**
   * Claim email payment
   */
  async claimEmailPayment(emailPaymentId: string, userId: string) {
    const user = await userService.getUserById(userId);

    // Get email payment
    const emailPayment = await prisma.emailPayment.findUnique({
      where: { id: emailPaymentId },
      include: {
        sender: true,
        transaction: true,
      },
    });

    if (!emailPayment) {
      throw new NotFoundError('Email payment not found');
    }

    // Verify recipient email matches
    if (emailPayment.recipientEmail !== user.email.toLowerCase()) {
      throw new ValidationError('This payment is not for you');
    }

    // Check if already claimed
    if (emailPayment.status === 'CLAIMED') {
      throw new ValidationError('Payment already claimed');
    }

    // Check if expired
    if (new Date() > emailPayment.expiresAt) {
      throw new ValidationError('Payment has expired');
    }

    // Check if cancelled
    if (emailPayment.status === 'CANCELLED') {
      throw new ValidationError('Payment has been cancelled');
    }

    // Get recipient smart account
    const recipientSmartAccount = await smartAccountService.getSmartAccountByUserId(userId);
    if (!recipientSmartAccount) {
      throw new NotFoundError('Recipient smart account not found');
    }

    try {
      // Update email payment status
      const updatedPayment = await prisma.emailPayment.update({
        where: { id: emailPaymentId },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
          recipientId: userId,
          recipientRegisteredAt: user.createdAt,
        },
      });

      // Update escrow balance
      if (emailPayment.escrowSmartAccountId) {
        await prisma.smartAccount.update({
          where: { id: emailPayment.escrowSmartAccountId },
          data: {
            balanceInEscrow: {
              decrement: parseFloat(emailPayment.amount.toString()),
            },
          },
        });
      }

      // Update transaction
      if (emailPayment.transaction) {
        await prisma.transaction.update({
          where: { id: emailPayment.transaction.id },
          data: {
            status: 'COMPLETED',
            recipientId: userId,
            completedAt: new Date(),
          },
        });
      }

      // Update pending email payment
      await prisma.pendingEmailPayment.update({
        where: { recipientEmail: emailPayment.recipientEmail },
        data: {
          totalAmount: {
            decrement: parseFloat(emailPayment.amount.toString()),
          },
          paymentCount: {
            decrement: 1,
          },
        },
      });

      // Create notifications
      await userService.createNotification(userId, {
        type: 'PAYMENT_CLAIMED',
        title: 'Payment Claimed',
        message: `You claimed ${emailPayment.amount} USDC from ${emailPayment.sender.email}`,
        actionUrl: `/payments/${emailPaymentId}`,
      });

      await userService.createNotification(emailPayment.senderId, {
        type: 'PAYMENT_CLAIMED',
        title: 'Payment Claimed',
        message: `${user.email} claimed your payment of ${emailPayment.amount} USDC`,
        actionUrl: `/payments/${emailPaymentId}`,
      });

      logger.info(`Email payment ${emailPaymentId} claimed by ${userId}`);

      return updatedPayment;
    } catch (error) {
      logger.error('Error claiming email payment:', error);
      throw new PaymentError('Failed to claim payment');
    }
  }

  /**
   * Cancel email payment (sender only)
   */
  async cancelEmailPayment(emailPaymentId: string, userId: string) {
    const emailPayment = await prisma.emailPayment.findUnique({
      where: { id: emailPaymentId },
    });

    if (!emailPayment) {
      throw new NotFoundError('Email payment not found');
    }

    if (emailPayment.senderId !== userId) {
      throw new ValidationError('Only sender can cancel payment');
    }

    if (emailPayment.status === 'CLAIMED') {
      throw new ValidationError('Cannot cancel claimed payment');
    }

    if (emailPayment.status === 'CANCELLED') {
      throw new ValidationError('Payment already cancelled');
    }

    // Update email payment
    const updated = await prisma.emailPayment.update({
      where: { id: emailPaymentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    });

    // Release escrow funds
    if (emailPayment.escrowSmartAccountId) {
      await prisma.smartAccount.update({
        where: { id: emailPayment.escrowSmartAccountId },
        data: {
          balanceInEscrow: {
            decrement: parseFloat(emailPayment.amount.toString()),
          },
        },
      });
    }

    // Update transaction
    const transaction = await prisma.transaction.findUnique({
      where: { emailPaymentId },
    });

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    // Update pending email payment
    await prisma.pendingEmailPayment.update({
      where: { recipientEmail: emailPayment.recipientEmail },
      data: {
        totalAmount: {
          decrement: parseFloat(emailPayment.amount.toString()),
        },
        paymentCount: {
          decrement: 1,
        },
      },
    });

    logger.info(`Email payment ${emailPaymentId} cancelled by ${userId}`);

    return updated;
  }

  /**
   * Get email payment by ID
   */
  async getEmailPaymentById(emailPaymentId: string, userId: string) {
    const emailPayment = await prisma.emailPayment.findFirst({
      where: {
        id: emailPaymentId,
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        transaction: true,
      },
    });

    if (!emailPayment) {
      throw new NotFoundError('Email payment not found');
    }

    return emailPayment;
  }

  /**
   * Get email payments for user
   */
  async getEmailPayments(userId: string, filters?: {
    sent?: boolean;
    received?: boolean;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.sent && filters?.received) {
      where.OR = [
        { senderId: userId },
        { recipientId: userId },
      ];
    } else if (filters?.sent) {
      where.senderId = userId;
    } else if (filters?.received) {
      where.recipientId = userId;
    } else {
      where.OR = [
        { senderId: userId },
        { recipientId: userId },
      ];
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [payments, total] = await Promise.all([
      prisma.emailPayment.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          recipient: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.emailPayment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Track email event (opened, clicked, etc.)
   */
  async trackEmailEvent(trackingId: string, eventType: string, metadata?: any) {
    const emailPayment = await prisma.emailPayment.findUnique({
      where: { emailTrackingId: trackingId },
    });

    if (!emailPayment) {
      logger.warn(`Email payment not found for tracking ID: ${trackingId}`);
      return null;
    }

    // Create event record
    await prisma.emailPaymentEvent.create({
      data: {
        emailPaymentId: emailPayment.id,
        eventType,
        eventData: metadata,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    // Update email payment status based on event
    const updates: any = {};

    if (eventType === 'opened' && !emailPayment.emailOpenedAt) {
      updates.emailOpenedAt = new Date();
      updates.status = 'OPENED';
    } else if (eventType === 'clicked' && !emailPayment.emailClickedAt) {
      updates.emailClickedAt = new Date();
      updates.status = 'CLICKED';
    }

    if (Object.keys(updates).length > 0) {
      await prisma.emailPayment.update({
        where: { id: emailPayment.id },
        data: updates,
      });
    }

    logger.info(`Email event tracked: ${eventType} for payment ${emailPayment.id}`);

    return emailPayment;
  }
}

export default new EmailPaymentService();
