// src/controllers/user.controller.ts

import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import { logger } from '../utils/logger';

class UserController {
  /**
   * Get user profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
          country: user.country,
          city: user.city,
          kycStatus: user.kycStatus,
          kycTier: user.kycTier,
          currency: user.currency,
          language: user.language,
          timezone: user.timezone,
          dailyLimit: user.dailyLimit.toString(),
          monthlyLimit: user.monthlyLimit.toString(),
          singleTxLimit: user.singleTxLimit.toString(),
          createdAt: user.createdAt,
          smartAccount: user.smartAccounts[0],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        fullName,
        phoneNumber,
        dateOfBirth,
        address,
        city,
        state,
        postalCode,
        country,
        currency,
        language,
        timezone,
      } = req.body;

      const user = await userService.updateProfile(userId, {
        fullName,
        phoneNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        address,
        city,
        state,
        postalCode,
        country,
        currency,
        language,
        timezone,
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const balance = await userService.getUserBalance(userId);

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const summary = await userService.getTransactionSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending email payments
   */
  async getPendingPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const payments = await userService.getPendingEmailPayments(userId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { notifyOnReceive, notifyOnSend, notifyOnClaim } = req.body;

      const user = await userService.updateNotificationPreferences(userId, {
        notifyOnReceive,
        notifyOnSend,
        notifyOnClaim,
      });

      res.json({
        success: true,
        message: 'Notification preferences updated',
        data: {
          notifyOnReceive: user.notifyOnReceive,
          notifyOnSend: user.notifyOnSend,
          notifyOnClaim: user.notifyOnClaim,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get activity logs
   */
  async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await userService.getActivityLogs(userId, limit);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await userService.getNotifications(userId, unreadOnly);

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const notification = await userService.markNotificationRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
