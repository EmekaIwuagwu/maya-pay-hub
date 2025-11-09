// src/routes/user.routes.ts

import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', userController.updateProfile);

/**
 * @route   GET /api/users/balance
 * @desc    Get user balance
 * @access  Private
 */
router.get('/balance', userController.getBalance);

/**
 * @route   GET /api/users/summary
 * @desc    Get transaction summary
 * @access  Private
 */
router.get('/summary', userController.getTransactionSummary);

/**
 * @route   GET /api/users/pending-payments
 * @desc    Get pending email payments
 * @access  Private
 */
router.get('/pending-payments', userController.getPendingPayments);

/**
 * @route   PUT /api/users/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notifications', userController.updateNotificationPreferences);

/**
 * @route   GET /api/users/activity
 * @desc    Get activity logs
 * @access  Private
 */
router.get('/activity', userController.getActivityLogs);

/**
 * @route   GET /api/users/notifications-list
 * @desc    Get notifications
 * @access  Private
 */
router.get('/notifications-list', userController.getNotifications);

/**
 * @route   PUT /api/users/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:notificationId/read', userController.markNotificationRead);

export default router;
