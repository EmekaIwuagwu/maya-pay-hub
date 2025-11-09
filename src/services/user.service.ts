// src/services/user.service.ts

import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import smartAccountService from './smartAccount.service';
import { cache, CACHE_KEYS, CACHE_TTL } from '../config/redis';

class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    // Check cache first
    const cached = await cache.get(CACHE_KEYS.USER(userId));
    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Cache for 5 minutes
    await cache.set(CACHE_KEYS.USER(userId), user, CACHE_TTL.USER);

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: {
    fullName?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    currency?: string;
    language?: string;
    timezone?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    // Invalidate cache
    await cache.del(CACHE_KEYS.USER(userId));

    logger.info(`User profile updated: ${userId}`);

    return user;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: {
    notifyOnReceive?: boolean;
    notifyOnSend?: boolean;
    notifyOnClaim?: boolean;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: preferences,
    });

    await cache.del(CACHE_KEYS.USER(userId));

    return user;
  }

  /**
   * Get user balance
   */
  async getUserBalance(userId: string) {
    const user = await this.getUserById(userId);

    if (!user.smartAccounts || user.smartAccounts.length === 0) {
      throw new NotFoundError('Smart account not found');
    }

    const smartAccount = user.smartAccounts[0];

    // Get latest balance from blockchain
    const balance = await smartAccountService.getSmartAccountBalance(smartAccount.id);

    return {
      userId: user.id,
      smartAccountAddress: smartAccount.accountAddress,
      balanceUSDC: balance.balance,
      balanceInEscrow: smartAccount.balanceInEscrow.toString(),
      availableBalance: (parseFloat(balance.balance) - parseFloat(smartAccount.balanceInEscrow.toString())).toFixed(6),
    };
  }

  /**
   * Get user transaction summary
   */
  async getTransactionSummary(userId: string) {
    const [totalSent, totalReceived, transactionCount, pendingCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          recipientId: userId,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.count({
        where: {
          userId,
        },
      }),
      prisma.transaction.count({
        where: {
          userId,
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
      }),
    ]);

    return {
      totalSent: totalSent._sum.amount?.toString() || '0',
      totalReceived: totalReceived._sum.amount?.toString() || '0',
      transactionCount,
      pendingCount,
    };
  }

  /**
   * Get user's pending email payments
   */
  async getPendingEmailPayments(userId: string) {
    const user = await this.getUserById(userId);

    const pendingPayments = await prisma.emailPayment.findMany({
      where: {
        recipientEmail: user.email.toLowerCase(),
        status: {
          in: ['PENDING', 'DELIVERED', 'OPENED', 'CLICKED'],
        },
      },
      include: {
        sender: {
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
    });

    return pendingPayments;
  }

  /**
   * Check if user can perform transaction
   */
  async checkTransactionLimits(userId: string, amount: number) {
    const user = await this.getUserById(userId);

    // Check single transaction limit
    if (amount > parseFloat(user.singleTxLimit.toString())) {
      throw new ValidationError(`Transaction exceeds single transaction limit of ${user.singleTxLimit} USDC`);
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTotal = await prisma.transaction.aggregate({
      where: {
        senderId: userId,
        createdAt: {
          gte: today,
        },
        status: {
          notIn: ['FAILED', 'CANCELLED'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const dailySpent = parseFloat(dailyTotal._sum.amount?.toString() || '0');
    const dailyLimit = parseFloat(user.dailyLimit.toString());

    if (dailySpent + amount > dailyLimit) {
      throw new ValidationError(`Transaction would exceed daily limit of ${dailyLimit} USDC`);
    }

    // Check monthly limit
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthlyTotal = await prisma.transaction.aggregate({
      where: {
        senderId: userId,
        createdAt: {
          gte: monthStart,
        },
        status: {
          notIn: ['FAILED', 'CANCELLED'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlySpent = parseFloat(monthlyTotal._sum.amount?.toString() || '0');
    const monthlyLimit = parseFloat(user.monthlyLimit.toString());

    if (monthlySpent + amount > monthlyLimit) {
      throw new ValidationError(`Transaction would exceed monthly limit of ${monthlyLimit} USDC`);
    }

    return {
      allowed: true,
      dailyRemaining: (dailyLimit - dailySpent).toFixed(2),
      monthlyRemaining: (monthlyLimit - monthlySpent).toFixed(2),
    };
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string, ipAddress?: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });
  }

  /**
   * Get user activity logs
   */
  async getActivityLogs(userId: string, limit: number = 50) {
    return await prisma.activityLog.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Log user activity
   */
  async logActivity(userId: string, action: string, details?: any, ipAddress?: string, userAgent?: string) {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, unreadOnly: boolean = false) {
    return await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Create notification
   */
  async createNotification(userId: string, data: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionData?: any;
  }) {
    return await prisma.notification.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  /**
   * Search users by email (admin only)
   */
  async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          kycStatus: true,
          kycTier: true,
          createdAt: true,
          isSuspended: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new UserService();
