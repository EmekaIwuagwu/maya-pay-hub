// src/services/phonePayment.service.ts

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, PaymentError } from '../utils/errors';
import { isValidPhoneNumber } from '../utils/validators';
import { generateTrackingId, addDays, formatPhoneNumber } from '../utils/helpers';
import smartAccountService from './smartAccount.service';
import userService from './user.service';
import smsService from './sms.service';
import { config } from '../config';

interface SendPhonePaymentParams {
  userId: string;
  recipientPhone: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}

class PhonePaymentService {
  /**
   * Send payment to phone number
   */
  async sendPhonePayment(params: SendPhonePaymentParams) {
    const {
      userId,
      recipientPhone,
      amount,
      personalMessage,
      referenceNote,
      expirationDays = config.emailPayments.expirationDays, // Use same config for now
    } = params;

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(recipientPhone);
    if (!isValidPhoneNumber(formattedPhone)) {
      throw new ValidationError('Invalid phone number');
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
    const recipient = await userService.getUserByPhone(formattedPhone);

    // Generate tracking ID
    const trackingId = generateTrackingId();

    // Calculate expiration date
    const expiresAt = addDays(new Date(), expirationDays);

    // Create phone payment record
    const phonePayment = await prisma.phonePayment.create({
      data: {
        senderId: userId,
        senderPhone: sender.phoneNumber || '',
        recipientPhone: formattedPhone,
        recipientId: recipient?.id,
        amount: amountNum,
        currency: 'USDC',
        status: 'PENDING',
        expiresAt,
        smsTrackingId: trackingId,
        personalMessage,
        referenceNote,
        escrowSmartAccountId: smartAccount.id,
      },
    });

    // Update or create pending phone payment record
    await prisma.pendingPhonePayment.upsert({
      where: {
        recipientPhone: formattedPhone,
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
        recipientPhone: formattedPhone,
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
        recipientPhone: formattedPhone,
        amount: amountNum,
        amountUSDC: amountNum,
        fee: 0,
        gasFee: 0,
        totalAmount: amountNum,
        status: 'IN_ESCROW',
        transactionType: 'PHONE_PAYMENT',
        isPhonePayment: true,
        phonePaymentId: phonePayment.id,
        useEscrow: true,
        referenceNote,
      },
    });

    // Generate claim URL
    const claimUrl = `${config.frontendUrl}/claim/phone/${trackingId}`;

    // Send SMS notification
    const smsResult = await smsService.sendPhonePaymentNotification({
      to: formattedPhone,
      senderName: sender.fullName || 'Someone',
      amount: amountNum.toString(),
      message: personalMessage,
      claimUrl,
      trackingId,
      expiresAt,
    });

    // Update phone payment with SMS status
    await prisma.phonePayment.update({
      where: { id: phonePayment.id },
      data: {
        smsSentAt: smsResult.success ? new Date() : null,
        smsMessageId: smsResult.messageId,
        status: smsResult.success ? 'DELIVERED' : 'PENDING',
      },
    });

    // Log activity
    await userService.logActivity(userId, 'PHONE_PAYMENT_SENT', {
      phonePaymentId: phonePayment.id,
      recipientPhone: formattedPhone,
      amount,
    });

    // Create notification
    await userService.createNotification(userId, {
      type: 'PHONE_PAYMENT_SENT',
      title: 'Payment Sent',
      message: `Your payment of ${amount} USDC to ${formattedPhone} is waiting to be claimed`,
      actionUrl: `/payments/${phonePayment.id}`,
    });

    logger.info(`Phone payment created: ${phonePayment.id} to ${formattedPhone}`);

    return {
      phonePayment,
      transaction,
      trackingId,
      claimUrl,
    };
  }

  /**
   * Claim phone payment
   */
  async claimPhonePayment(phonePaymentId: string, userId: string) {
    const user = await userService.getUserById(userId);

    // Get phone payment
    const phonePayment = await prisma.phonePayment.findUnique({
      where: { id: phonePaymentId },
      include: {
        sender: true,
        transaction: true,
      },
    });

    if (!phonePayment) {
      throw new NotFoundError('Phone payment not found');
    }

    // Verify recipient phone matches
    if (phonePayment.recipientPhone !== user.phoneNumber) {
      throw new ValidationError('This payment is not for you');
    }

    // Check if already claimed
    if (phonePayment.status === 'CLAIMED') {
      throw new ValidationError('Payment already claimed');
    }

    // Check if expired
    if (new Date() > phonePayment.expiresAt) {
      throw new ValidationError('Payment has expired');
    }

    // Check if cancelled
    if (phonePayment.status === 'CANCELLED') {
      throw new ValidationError('Payment has been cancelled');
    }

    // Get recipient smart account
    const recipientSmartAccount = await smartAccountService.getSmartAccountByUserId(userId);
    if (!recipientSmartAccount) {
      throw new NotFoundError('Recipient smart account not found');
    }

    try {
      // Update phone payment status
      const updatedPayment = await prisma.phonePayment.update({
        where: { id: phonePaymentId },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
          recipientId: userId,
          recipientRegisteredAt: user.createdAt,
        },
      });

      // Update escrow balance
      if (phonePayment.escrowSmartAccountId) {
        await prisma.smartAccount.update({
          where: { id: phonePayment.escrowSmartAccountId },
          data: {
            balanceInEscrow: {
              decrement: parseFloat(phonePayment.amount.toString()),
            },
          },
        });
      }

      // Update transaction
      if (phonePayment.transaction) {
        await prisma.transaction.update({
          where: { id: phonePayment.transaction.id },
          data: {
            status: 'COMPLETED',
            recipientId: userId,
            completedAt: new Date(),
          },
        });
      }

      // Update pending phone payment
      await prisma.pendingPhonePayment.update({
        where: { recipientPhone: phonePayment.recipientPhone },
        data: {
          totalAmount: {
            decrement: parseFloat(phonePayment.amount.toString()),
          },
          paymentCount: {
            decrement: 1,
          },
        },
      });

      // Send SMS to sender
      if (phonePayment.sender.phoneNumber) {
        await smsService.sendPaymentClaimedNotification(
          phonePayment.sender.phoneNumber,
          phonePayment.recipientPhone,
          phonePayment.amount.toString()
        );
      }

      // Send SMS to recipient
      if (user.phoneNumber) {
        await smsService.sendPaymentReceivedNotification(
          user.phoneNumber,
          phonePayment.sender.fullName || 'Someone',
          phonePayment.amount.toString()
        );
      }

      // Log activity
      await userService.logActivity(userId, 'PHONE_PAYMENT_CLAIMED', {
        phonePaymentId,
        amount: phonePayment.amount.toString(),
      });

      // Create notification
      await userService.createNotification(userId, {
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: `You received ${phonePayment.amount} USDC from ${phonePayment.sender.fullName}`,
        actionUrl: `/transactions/${phonePayment.transaction?.id}`,
      });

      logger.info(`Phone payment claimed: ${phonePaymentId} by ${userId}`);

      return updatedPayment;
    } catch (error) {
      logger.error(`Error claiming phone payment ${phonePaymentId}:`, error);
      throw error;
    }
  }

  /**
   * Get phone payment by tracking ID
   */
  async getPhonePaymentByTrackingId(trackingId: string) {
    const phonePayment = await prisma.phonePayment.findUnique({
      where: { smsTrackingId: trackingId },
      include: {
        sender: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!phonePayment) {
      throw new NotFoundError('Phone payment not found');
    }

    // Don't expose sensitive info for unclaimed payments
    return {
      id: phonePayment.id,
      amount: phonePayment.amount.toString(),
      message: phonePayment.personalMessage,
      status: phonePayment.status,
      sender: {
        fullName: phonePayment.sender.fullName || 'Someone',
      },
      expiresAt: phonePayment.expiresAt,
      createdAt: phonePayment.createdAt,
    };
  }

  /**
   * Get sent phone payments for user
   */
  async getSentPhonePayments(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.phonePayment.findMany({
        where: { senderId: userId },
        include: {
          recipient: {
            select: {
              fullName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.phonePayment.count({
        where: { senderId: userId },
      }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get received phone payments for user
   */
  async getReceivedPhonePayments(userId: string, page: number = 1, limit: number = 20) {
    const user = await userService.getUserById(userId);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.phonePayment.findMany({
        where: {
          OR: [
            { recipientId: userId },
            { recipientPhone: user.phoneNumber },
          ],
        },
        include: {
          sender: {
            select: {
              fullName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.phonePayment.count({
        where: {
          OR: [
            { recipientId: userId },
            { recipientPhone: user.phoneNumber },
          ],
        },
      }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel phone payment (sender only, before claimed)
   */
  async cancelPhonePayment(phonePaymentId: string, userId: string, reason?: string) {
    const phonePayment = await prisma.phonePayment.findUnique({
      where: { id: phonePaymentId },
    });

    if (!phonePayment) {
      throw new NotFoundError('Phone payment not found');
    }

    // Verify sender
    if (phonePayment.senderId !== userId) {
      throw new ValidationError('Only the sender can cancel this payment');
    }

    // Check if already claimed
    if (phonePayment.status === 'CLAIMED') {
      throw new ValidationError('Payment already claimed and cannot be cancelled');
    }

    // Cancel payment
    const cancelled = await prisma.phonePayment.update({
      where: { id: phonePaymentId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason,
      },
    });

    // Release escrow
    if (phonePayment.escrowSmartAccountId) {
      await prisma.smartAccount.update({
        where: { id: phonePayment.escrowSmartAccountId },
        data: {
          balanceInEscrow: {
            decrement: parseFloat(phonePayment.amount.toString()),
          },
        },
      });
    }

    // Update transaction
    await prisma.transaction.updateMany({
      where: { phonePaymentId },
      data: {
        status: 'CANCELLED',
      },
    });

    // Update pending phone payment
    await prisma.pendingPhonePayment.update({
      where: { recipientPhone: phonePayment.recipientPhone },
      data: {
        totalAmount: {
          decrement: parseFloat(phonePayment.amount.toString()),
        },
        paymentCount: {
          decrement: 1,
        },
      },
    });

    logger.info(`Phone payment cancelled: ${phonePaymentId}`);

    return cancelled;
  }
}

export default new PhonePaymentService();
