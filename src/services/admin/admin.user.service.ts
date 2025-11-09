// src/services/admin/admin.user.service.ts

import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { parsePagination, createPaginationResponse } from '../../utils/helpers';

class AdminUserService {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters?: {
    search?: string;
    kycStatus?: string;
    kycTier?: string;
    isSuspended?: boolean;
    isFlagged?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { skip, take, page, limit } = parsePagination(
      filters?.page?.toString(),
      filters?.limit?.toString()
    );

    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.kycStatus) {
      where.kycStatus = filters.kycStatus;
    }

    if (filters?.kycTier) {
      where.kycTier = filters.kycTier;
    }

    if (typeof filters?.isSuspended === 'boolean') {
      where.isSuspended = filters.isSuspended;
    }

    if (typeof filters?.isFlagged === 'boolean') {
      where.isFlagged = filters.isFlagged;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          smartAccounts: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              transactions: true,
              emailPaymentsSent: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return createPaginationResponse(users, total, page, limit);
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        smartAccounts: true,
        _count: {
          select: {
            transactions: true,
            emailPaymentsSent: true,
            emailPaymentsReceived: true,
            bankAccounts: true,
            cards: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get transaction summary
    const [sentTotal, receivedTotal] = await Promise.all([
      prisma.transaction.aggregate({
        where: { senderId: userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { recipientId: userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...user,
      stats: {
        totalSent: sentTotal._sum.amount?.toString() || '0',
        totalReceived: receivedTotal._sum.amount?.toString() || '0',
        transactionCount: user._count.transactions,
        emailPaymentsSent: user._count.emailPaymentsSent,
        emailPaymentsReceived: user._count.emailPaymentsReceived,
      },
    };
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason,
        suspendedBy: adminId,
      },
    });

    logger.info(`User suspended: ${user.email} by admin ${adminId}`);

    return user;
  }

  /**
   * Unsuspend user account
   */
  async unsuspendUser(userId: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
      },
    });

    logger.info(`User unsuspended: ${user.email} by admin ${adminId}`);

    return user;
  }

  /**
   * Flag user for review
   */
  async flagUser(userId: string, reason: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isFlagged: true,
        flaggedReason: reason,
      },
    });

    logger.info(`User flagged: ${user.email} by admin ${adminId}`);

    return user;
  }

  /**
   * Unflag user
   */
  async unflagUser(userId: string, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isFlagged: false,
        flaggedReason: null,
      },
    });

    logger.info(`User unflagged: ${user.email} by admin ${adminId}`);

    return user;
  }

  /**
   * Update user KYC status
   */
  async updateKYCStatus(userId: string, data: {
    kycStatus: string;
    kycTier?: string;
    rejectionReason?: string;
  }, adminId: string) {
    const updateData: any = {
      kycStatus: data.kycStatus,
    };

    if (data.kycStatus === 'VERIFIED') {
      updateData.kycVerifiedAt = new Date();
      updateData.kycTier = data.kycTier || 'VERIFIED';
    }

    if (data.kycStatus === 'REJECTED') {
      updateData.kycRejectedAt = new Date();
      updateData.kycRejectionReason = data.rejectionReason;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info(`User KYC updated: ${user.email} to ${data.kycStatus} by admin ${adminId}`);

    return user;
  }

  /**
   * Update user limits
   */
  async updateLimits(userId: string, limits: {
    dailyLimit?: number;
    monthlyLimit?: number;
    singleTxLimit?: number;
  }, adminId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: limits,
    });

    logger.info(`User limits updated: ${user.email} by admin ${adminId}`);

    return user;
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId: string, page: number = 1, limit: number = 20) {
    const { skip, take } = parsePagination(page.toString(), limit.toString());

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { userId },
            { senderId: userId },
            { recipientId: userId },
          ],
        },
        include: {
          sender: { select: { email: true, fullName: true } },
          recipient: { select: { email: true, fullName: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({
        where: {
          OR: [
            { userId },
            { senderId: userId },
            { recipientId: userId },
          ],
        },
      }),
    ]);

    return createPaginationResponse(transactions, total, page, limit);
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(userId: string, page: number = 1, limit: number = 50) {
    const { skip, take } = parsePagination(page.toString(), limit.toString());

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where: { userId } }),
    ]);

    return createPaginationResponse(logs, total, page, limit);
  }

  /**
   * Add admin note to user
   */
  async addUserNote(userId: string, note: string, category: string | undefined, adminId: string) {
    const userNote = await prisma.adminUserNote.create({
      data: {
        userId,
        adminId,
        note,
        category,
      },
      include: {
        admin: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return userNote;
  }

  /**
   * Get user notes
   */
  async getUserNotes(userId: string) {
    return await prisma.adminUserNote.findMany({
      where: { userId },
      include: {
        admin: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      flaggedUsers,
      kycPending,
      kycVerified,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.count({ where: { isFlagged: true } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      flaggedUsers,
      kycPending,
      kycVerified,
    };
  }
}

export default new AdminUserService();
