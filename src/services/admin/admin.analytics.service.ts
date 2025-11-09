// src/services/admin/admin.analytics.service.ts

import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

class AdminAnalyticsService {
  /**
   * Get dashboard overview
   */
  async getDashboardOverview() {
    const [
      totalUsers,
      totalTransactions,
      totalVolume,
      totalEmailPayments,
      activeUsersToday,
      transactionsToday,
      volumeToday,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Total transactions
      prisma.transaction.count(),

      // Total volume
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),

      // Total email payments
      prisma.emailPayment.count(),

      // Active users today
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Transactions today
      prisma.transaction.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Volume today
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        activeToday: activeUsersToday,
      },
      transactions: {
        total: totalTransactions,
        today: transactionsToday,
      },
      volume: {
        total: totalVolume._sum.amount?.toString() || '0',
        today: volumeToday._sum.amount?.toString() || '0',
      },
      emailPayments: {
        total: totalEmailPayments,
      },
    };
  }

  /**
   * Get transaction statistics for period
   */
  async getTransactionStats(startDate: Date, endDate: Date) {
    const [
      totalCount,
      completedCount,
      failedCount,
      pendingCount,
      totalVolume,
      byType,
      byStatus,
    ] = await Promise.all([
      // Total count
      prisma.transaction.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Completed count
      prisma.transaction.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
      }),

      // Failed count
      prisma.transaction.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'FAILED',
        },
      }),

      // Pending count
      prisma.transaction.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),

      // Total volume
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // Group by type
      prisma.transaction.groupBy({
        by: ['transactionType'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { amount: true },
      }),

      // Group by status
      prisma.transaction.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),
    ]);

    return {
      summary: {
        totalCount,
        completedCount,
        failedCount,
        pendingCount,
        totalVolume: totalVolume._sum.amount?.toString() || '0',
        successRate: totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(2) : '0',
      },
      byType: byType.map(t => ({
        type: t.transactionType,
        count: t._count,
        volume: t._sum.amount?.toString() || '0',
      })),
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  /**
   * Get user growth statistics
   */
  async getUserGrowthStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usersByDay = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return usersByDay.map(day => ({
      date: day.date,
      count: Number(day.count),
    }));
  }

  /**
   * Get transaction volume over time
   */
  async getVolumeOverTime(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const volumeByDay = await prisma.$queryRaw<Array<{ date: Date; volume: string; count: bigint }>>`
      SELECT
        DATE(created_at) as date,
        SUM(amount)::text as volume,
        COUNT(*)::int as count
      FROM transactions
      WHERE created_at >= ${startDate}
        AND status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return volumeByDay.map(day => ({
      date: day.date,
      volume: day.volume,
      count: Number(day.count),
    }));
  }

  /**
   * Get email payment statistics
   */
  async getEmailPaymentStats(startDate: Date, endDate: Date) {
    const [
      totalSent,
      totalClaimed,
      totalExpired,
      totalCancelled,
      claimRate,
      avgClaimTime,
    ] = await Promise.all([
      prisma.emailPayment.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),

      prisma.emailPayment.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'CLAIMED',
        },
      }),

      prisma.emailPayment.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'EXPIRED',
        },
      }),

      prisma.emailPayment.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'CANCELLED',
        },
      }),

      prisma.emailPayment.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'CLAIMED',
        },
        _count: true,
      }),

      prisma.emailPayment.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'CLAIMED',
          claimedAt: { not: null },
        },
        select: {
          createdAt: true,
          claimedAt: true,
        },
      }),
    ]);

    // Calculate average claim time
    let avgClaimHours = 0;
    if (avgClaimTime.length > 0) {
      const totalHours = avgClaimTime.reduce((sum, payment) => {
        if (payment.claimedAt) {
          const hours = (payment.claimedAt.getTime() - payment.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      avgClaimHours = totalHours / avgClaimTime.length;
    }

    return {
      totalSent,
      totalClaimed,
      totalExpired,
      totalCancelled,
      claimRate: totalSent > 0 ? ((totalClaimed / totalSent) * 100).toFixed(2) : '0',
      avgClaimTimeHours: avgClaimHours.toFixed(2),
    };
  }

  /**
   * Get KYC statistics
   */
  async getKYCStats() {
    const byStatus = await prisma.user.groupBy({
      by: ['kycStatus'],
      _count: true,
    });

    const byTier = await prisma.user.groupBy({
      by: ['kycTier'],
      _count: true,
    });

    return {
      byStatus: byStatus.map(s => ({
        status: s.kycStatus,
        count: s._count,
      })),
      byTier: byTier.map(t => ({
        tier: t.kycTier,
        count: t._count,
      })),
    };
  }

  /**
   * Get top users by volume
   */
  async getTopUsers(limit: number = 10) {
    const topUsers = await prisma.transaction.groupBy({
      by: ['senderId'],
      where: {
        status: 'COMPLETED',
        senderId: { not: null },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = topUsers.map(u => u.senderId).filter(id => id !== null) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        fullName: true,
        kycTier: true,
      },
    });

    return topUsers.map(u => {
      const user = users.find(usr => usr.id === u.senderId);
      return {
        userId: u.senderId,
        email: user?.email,
        fullName: user?.fullName,
        kycTier: user?.kycTier,
        totalVolume: u._sum.amount?.toString() || '0',
        transactionCount: u._count,
      };
    });
  }

  /**
   * Get paymaster metrics
   */
  async getPaymasterMetrics(startDate: Date, endDate: Date) {
    const metrics = await prisma.paymasterMetrics.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const summary = metrics.reduce(
      (acc, m) => ({
        totalOperations: acc.totalOperations + m.totalOperations,
        successfulOps: acc.successfulOps + m.successfulOps,
        failedOps: acc.failedOps + m.failedOps,
        totalGasUSDC: acc.totalGasUSDC + parseFloat(m.totalGasUSDC.toString()),
        sponsoredOps: acc.sponsoredOps + m.sponsoredOps,
        sponsoredGasUSDC: acc.sponsoredGasUSDC + parseFloat(m.sponsoredGasUSDC.toString()),
      }),
      {
        totalOperations: 0,
        successfulOps: 0,
        failedOps: 0,
        totalGasUSDC: 0,
        sponsoredOps: 0,
        sponsoredGasUSDC: 0,
      }
    );

    return {
      summary: {
        ...summary,
        totalGasUSDC: summary.totalGasUSDC.toFixed(6),
        sponsoredGasUSDC: summary.sponsoredGasUSDC.toFixed(6),
        avgGasPerOp: summary.totalOperations > 0
          ? (summary.totalGasUSDC / summary.totalOperations).toFixed(6)
          : '0',
        successRate: summary.totalOperations > 0
          ? ((summary.successfulOps / summary.totalOperations) * 100).toFixed(2)
          : '0',
      },
      daily: metrics.map(m => ({
        date: m.date,
        operations: m.totalOperations,
        gasUSDC: m.totalGasUSDC.toString(),
        sponsoredOps: m.sponsoredOps,
      })),
    };
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 20) {
    const [transactions, users, emailPayments] = await Promise.all([
      prisma.transaction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { email: true } },
          recipient: { select: { email: true } },
        },
      }),

      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true },
      }),

      prisma.emailPayment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          recipientEmail: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      recentTransactions: transactions,
      newUsers: users,
      recentEmailPayments: emailPayments,
    };
  }
}

export default new AdminAnalyticsService();
