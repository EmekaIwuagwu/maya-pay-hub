// src/services/transaction.service.ts

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, PaymentError } from '../utils/errors';
import blockchainService from './blockchain.service';
import smartAccountService from './smartAccount.service';
import userService from './user.service';
import paymasterService from './paymaster.service';

interface SendTransactionParams {
  userId: string;
  recipientAddress?: string;
  recipientEmail?: string;
  amount: string;
  referenceNote?: string;
  useEscrow?: boolean;
}

class TransactionService {
  /**
   * Send USDC transaction
   */
  async sendTransaction(params: SendTransactionParams) {
    const { userId, recipientAddress, recipientEmail, amount, referenceNote, useEscrow } = params;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError('Invalid amount');
    }

    // Check user limits
    await userService.checkTransactionLimits(userId, amountNum);

    // Get user's smart account
    const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);
    if (!smartAccount) {
      throw new NotFoundError('Smart account not found');
    }

    // Check balance
    const balance = await smartAccountService.getSmartAccountBalance(smartAccount.id);
    if (parseFloat(balance.balance) < amountNum) {
      throw new PaymentError('Insufficient balance');
    }

    let transaction;

    if (recipientEmail) {
      // Email payment flow - will be handled by email payment service
      throw new ValidationError('Email payments should use /api/payments/email endpoint');
    }

    if (!recipientAddress) {
      throw new ValidationError('Recipient address required');
    }

    // Find recipient user by address
    const recipientSmartAccount = await smartAccountService.getSmartAccountByAddress(recipientAddress);
    const recipientId = recipientSmartAccount?.userId;

    // Create transaction record
    transaction = await prisma.transaction.create({
      data: {
        userId,
        senderId: userId,
        recipientId,
        recipientWalletAddress: recipientAddress,
        amount: amountNum,
        amountUSDC: amountNum,
        fee: 0, // No platform fee for now
        gasFee: 0, // Will be updated after UserOp
        gasPaidInUSDC: true,
        totalAmount: amountNum,
        status: 'PENDING',
        transactionType: 'SEND',
        referenceNote,
        useEscrow: useEscrow || false,
      },
    });

    try {
      // Create UserOperation for blockchain transaction
      const userOpResult = await blockchainService.sendUSDC({
        fromSmartAccountId: smartAccount.id,
        toAddress: recipientAddress,
        amount,
        userId,
      });

      // Update transaction with UserOp details
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          userOpHash: userOpResult.userOpHash,
          userOperationId: (await prisma.userOperation.findUnique({
            where: { userOpHash: userOpResult.userOpHash },
          }))?.id,
          gasFee: parseFloat(userOpResult.estimatedGasUSDC),
          paymasterUsed: userOpResult.paymasterUsed,
          status: 'PROCESSING',
        },
      });

      // Log activity
      await userService.logActivity(
        userId,
        'TRANSACTION_CREATED',
        {
          transactionId: transaction.id,
          amount,
          recipient: recipientAddress,
        }
      );

      // Create notification for sender
      await userService.createNotification(userId, {
        type: 'TRANSACTION_INITIATED',
        title: 'Transaction Initiated',
        message: `Your transfer of ${amount} USDC is being processed`,
        actionUrl: `/transactions/${transaction.id}`,
      });

      // Create notification for recipient if they're a user
      if (recipientId) {
        await userService.createNotification(recipientId, {
          type: 'PAYMENT_RECEIVED',
          title: 'Payment Received',
          message: `You received ${amount} USDC`,
          actionUrl: `/transactions/${transaction.id}`,
        });
      }

      logger.info(`Transaction created: ${transaction.id}`);

      return {
        transaction,
        userOpHash: userOpResult.userOpHash,
        estimatedGasUSDC: userOpResult.estimatedGasUSDC,
      };
    } catch (error: any) {
      // Update transaction status to failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string, userId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          { userId },
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
        userOperation: true,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, filters?: {
    status?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { userId },
        { senderId: userId },
        { recipientId: userId },
      ],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.transactionType = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
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
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update transaction status (called by blockchain monitoring job)
   */
  async updateTransactionStatus(transactionId: string, data: {
    status: string;
    transactionHash?: string;
    blockNumber?: bigint;
    actualGasUsed?: bigint;
    gasFee?: number;
    failureReason?: string;
  }) {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        updatedAt: new Date(),
      },
    });

    // Create notification for status update
    if (data.status === 'COMPLETED') {
      await userService.createNotification(transaction.userId, {
        type: 'TRANSACTION_COMPLETED',
        title: 'Transaction Completed',
        message: `Your transfer of ${transaction.amount} USDC has been completed`,
        actionUrl: `/transactions/${transaction.id}`,
      });
    } else if (data.status === 'FAILED') {
      await userService.createNotification(transaction.userId, {
        type: 'TRANSACTION_FAILED',
        title: 'Transaction Failed',
        message: `Your transfer of ${transaction.amount} USDC has failed`,
        actionUrl: `/transactions/${transaction.id}`,
      });
    }

    logger.info(`Transaction ${transactionId} status updated to ${data.status}`);

    return transaction;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(userId: string, period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const [sent, received, totalGasPaid] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          recipientId: userId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
        _sum: { gasFee: true },
      }),
    ]);

    return {
      period,
      sent: {
        amount: sent._sum.amount?.toString() || '0',
        count: sent._count,
      },
      received: {
        amount: received._sum.amount?.toString() || '0',
        count: received._count,
      },
      totalGasPaid: totalGasPaid._sum.gasFee?.toString() || '0',
    };
  }

  /**
   * Cancel pending transaction
   */
  async cancelTransaction(transactionId: string, userId: string) {
    const transaction = await this.getTransactionById(transactionId, userId);

    if (transaction.senderId !== userId) {
      throw new ValidationError('Only sender can cancel transaction');
    }

    if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
      throw new ValidationError('Cannot cancel transaction in current status');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    logger.info(`Transaction ${transactionId} cancelled by user ${userId}`);

    return updated;
  }
}

export default new TransactionService();
