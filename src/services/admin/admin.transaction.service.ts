// src/services/admin/admin.transaction.service.ts

import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { createPaginationResponse } from '../../utils/helpers';

class AdminTransactionService {
  /**
   * Get all transactions with filters
   */
  async getTransactions(filters?: {
    search?: string;
    status?: string;
    transactionType?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: string;
    maxAmount?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Date range
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Status filter
    if (filters?.status) {
      where.status = filters.status;
    }

    // Transaction type filter
    if (filters?.transactionType) {
      where.transactionType = filters.transactionType;
    }

    // Amount range
    if (filters?.minAmount || filters?.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    // Search by transaction hash or user email
    if (filters?.search) {
      where.OR = [
        { txHash: { contains: filters.search, mode: 'insensitive' } },
        { userOpHash: { contains: filters.search, mode: 'insensitive' } },
        { sender: { email: { contains: filters.search, mode: 'insensitive' } } },
        { recipient: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
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
          userOperation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return createPaginationResponse(transactions, total, page, limit);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
            smartAccounts: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            fullName: true,
            smartAccounts: true,
          },
        },
        userOperation: {
          include: {
            gasSponsorship: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  /**
   * Update transaction status (admin override)
   */
  async updateTransactionStatus(
    transactionId: string,
    status: string,
    adminId: string,
    notes?: string
  ) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: status as any,
        metadata: {
          ...((transaction.metadata as any) || {}),
          adminOverride: {
            adminId,
            previousStatus: transaction.status,
            newStatus: status,
            timestamp: new Date().toISOString(),
            notes,
          },
        },
      },
    });

    logger.info(`Transaction ${transactionId} status updated to ${status} by admin ${adminId}`);

    return updated;
  }

  /**
   * Flag suspicious transaction
   */
  async flagTransaction(
    transactionId: string,
    adminId: string,
    reason: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        metadata: {
          ...((transaction.metadata as any) || {}),
          flagged: {
            adminId,
            reason,
            severity,
            timestamp: new Date().toISOString(),
          },
        },
      },
    });

    logger.warn(`Transaction ${transactionId} flagged by admin ${adminId}: ${reason} (${severity})`);

    return updated;
  }

  /**
   * Get failed transactions
   */
  async getFailedTransactions(limit: number = 50) {
    return await prisma.transaction.findMany({
      where: {
        status: 'FAILED',
      },
      include: {
        sender: {
          select: {
            email: true,
            fullName: true,
          },
        },
        userOperation: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(limit: number = 50) {
    return await prisma.transaction.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      include: {
        sender: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get high value transactions
   */
  async getHighValueTransactions(threshold: string = '1000', limit: number = 50) {
    return await prisma.transaction.findMany({
      where: {
        amount: {
          gte: threshold,
        },
        status: 'COMPLETED',
      },
      include: {
        sender: {
          select: {
            email: true,
            fullName: true,
            kycTier: true,
          },
        },
        recipient: {
          select: {
            email: true,
            fullName: true,
            kycTier: true,
          },
        },
      },
      orderBy: { amount: 'desc' },
      take: limit,
    });
  }

  /**
   * Get user operation details
   */
  async getUserOperation(userOpHash: string) {
    const userOp = await prisma.userOperation.findUnique({
      where: { userOpHash },
      include: {
        smartAccount: {
          include: {
            user: {
              select: {
                email: true,
                fullName: true,
              },
            },
          },
        },
        gasSponsorship: true,
        transaction: true,
      },
    });

    if (!userOp) {
      throw new NotFoundError('UserOperation not found');
    }

    return userOp;
  }

  /**
   * Retry failed transaction (admin action)
   */
  async retryTransaction(transactionId: string, adminId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status !== 'FAILED') {
      throw new ValidationError('Only failed transactions can be retried');
    }

    // Update transaction to pending for retry
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'PENDING',
        metadata: {
          ...((transaction.metadata as any) || {}),
          retryAttempt: {
            adminId,
            timestamp: new Date().toISOString(),
            previousAttempts: ((transaction.metadata as any)?.retryAttempt?.previousAttempts || 0) + 1,
          },
        },
      },
    });

    logger.info(`Transaction ${transactionId} marked for retry by admin ${adminId}`);

    return updated;
  }

  /**
   * Get transaction statistics by user
   */
  async getUserTransactionStats(userId: string) {
    const [
      totalSent,
      totalReceived,
      sentVolume,
      receivedVolume,
      failedCount,
      recentTransactions,
    ] = await Promise.all([
      prisma.transaction.count({
        where: { senderId: userId },
      }),
      prisma.transaction.count({
        where: { recipientId: userId },
      }),
      prisma.transaction.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          recipientId: userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          senderId: userId,
          status: 'FAILED',
        },
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalSent,
      totalReceived,
      sentVolume: sentVolume._sum.amount?.toString() || '0',
      receivedVolume: receivedVolume._sum.amount?.toString() || '0',
      failedCount,
      recentTransactions,
    };
  }

  /**
   * Export transactions to CSV data
   */
  async exportTransactions(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        sender: {
          select: {
            email: true,
            fullName: true,
          },
        },
        recipient: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(tx => ({
      id: tx.id,
      createdAt: tx.createdAt.toISOString(),
      status: tx.status,
      type: tx.transactionType,
      amount: tx.amount,
      senderEmail: tx.sender?.email || 'N/A',
      senderName: tx.sender?.fullName || 'N/A',
      recipientEmail: tx.recipient?.email || 'N/A',
      recipientName: tx.recipient?.fullName || 'N/A',
      txHash: tx.txHash || 'N/A',
      userOpHash: tx.userOpHash || 'N/A',
    }));
  }
}

export default new AdminTransactionService();
