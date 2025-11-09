// src/controllers/admin/admin.dashboard.controller.ts

import { Request, Response } from 'express';
import adminAnalyticsService from '../../services/admin/admin.analytics.service';
import { asyncHandler } from '../../utils/helpers';
import { ValidationError } from '../../utils/errors';

class AdminDashboardController {
  /**
   * Get dashboard overview
   * GET /api/admin/dashboard/overview
   */
  getOverview = asyncHandler(async (req: Request, res: Response) => {
    const overview = await adminAnalyticsService.getDashboardOverview();

    res.json({
      success: true,
      data: overview,
    });
  });

  /**
   * Get transaction statistics
   * GET /api/admin/dashboard/transactions/stats
   */
  getTransactionStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const stats = await adminAnalyticsService.getTransactionStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get user growth statistics
   * GET /api/admin/dashboard/users/growth
   */
  getUserGrowth = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    const growth = await adminAnalyticsService.getUserGrowthStats(days);

    res.json({
      success: true,
      data: growth,
    });
  });

  /**
   * Get volume over time
   * GET /api/admin/dashboard/volume
   */
  getVolumeOverTime = asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;

    const volume = await adminAnalyticsService.getVolumeOverTime(days);

    res.json({
      success: true,
      data: volume,
    });
  });

  /**
   * Get email payment statistics
   * GET /api/admin/dashboard/email-payments/stats
   */
  getEmailPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const stats = await adminAnalyticsService.getEmailPaymentStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get KYC statistics
   * GET /api/admin/dashboard/kyc/stats
   */
  getKYCStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminAnalyticsService.getKYCStats();

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get top users by volume
   * GET /api/admin/dashboard/users/top
   */
  getTopUsers = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const topUsers = await adminAnalyticsService.getTopUsers(limit);

    res.json({
      success: true,
      data: topUsers,
    });
  });

  /**
   * Get paymaster metrics
   * GET /api/admin/dashboard/paymaster/metrics
   */
  getPaymasterMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const metrics = await adminAnalyticsService.getPaymasterMetrics(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: metrics,
    });
  });

  /**
   * Get recent activity
   * GET /api/admin/dashboard/activity/recent
   */
  getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;

    const activity = await adminAnalyticsService.getRecentActivity(limit);

    res.json({
      success: true,
      data: activity,
    });
  });
}

export default new AdminDashboardController();
