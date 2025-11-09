// src/routes/admin.routes.ts

import { Router } from 'express';
import adminAuthController from '../controllers/admin/admin.auth.controller';
import adminUserController from '../controllers/admin/admin.user.controller';
import adminDashboardController from '../controllers/admin/admin.dashboard.controller';
import adminTransactionController from '../controllers/admin/admin.transaction.controller';
import {
  authenticateAdmin,
  requireSuperAdmin,
  requirePermission,
  requireAdminOrModerator,
} from '../middleware/admin.middleware';

const router = Router();

// =============================================================================
// Admin Authentication Routes (Public)
// =============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login with email/password (+ optional 2FA)
 * @access  Public
 */
router.post('/auth/login', adminAuthController.login);

// =============================================================================
// Protected Admin Routes (All require authentication)
// =============================================================================

// Apply admin authentication to all routes below
router.use(authenticateAdmin);

// -----------------------------------------------------------------------------
// Admin Auth & Profile Routes
// -----------------------------------------------------------------------------

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Admin
 */
router.get('/auth/me', adminAuthController.getProfile);

/**
 * @route   POST /api/admin/auth/2fa/setup
 * @desc    Setup 2FA for admin
 * @access  Admin
 */
router.post('/auth/2fa/setup', adminAuthController.setup2FA);

/**
 * @route   POST /api/admin/auth/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Admin
 */
router.post('/auth/2fa/verify', adminAuthController.verify2FA);

/**
 * @route   PUT /api/admin/auth/password
 * @desc    Update admin password
 * @access  Admin
 */
router.put('/auth/password', adminAuthController.updatePassword);

/**
 * @route   POST /api/admin/auth/create
 * @desc    Create new admin (super admin only)
 * @access  Super Admin
 */
router.post('/auth/create', requireSuperAdmin, adminAuthController.createAdmin);

// -----------------------------------------------------------------------------
// Dashboard & Analytics Routes
// -----------------------------------------------------------------------------

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Get dashboard overview
 * @access  Admin
 */
router.get('/dashboard/overview', adminDashboardController.getOverview);

/**
 * @route   GET /api/admin/dashboard/transactions/stats
 * @desc    Get transaction statistics
 * @access  Admin
 */
router.get('/dashboard/transactions/stats', adminDashboardController.getTransactionStats);

/**
 * @route   GET /api/admin/dashboard/users/growth
 * @desc    Get user growth statistics
 * @access  Admin
 */
router.get('/dashboard/users/growth', adminDashboardController.getUserGrowth);

/**
 * @route   GET /api/admin/dashboard/volume
 * @desc    Get volume over time
 * @access  Admin
 */
router.get('/dashboard/volume', adminDashboardController.getVolumeOverTime);

/**
 * @route   GET /api/admin/dashboard/email-payments/stats
 * @desc    Get email payment statistics
 * @access  Admin
 */
router.get('/dashboard/email-payments/stats', adminDashboardController.getEmailPaymentStats);

/**
 * @route   GET /api/admin/dashboard/kyc/stats
 * @desc    Get KYC statistics
 * @access  Admin
 */
router.get('/dashboard/kyc/stats', adminDashboardController.getKYCStats);

/**
 * @route   GET /api/admin/dashboard/users/top
 * @desc    Get top users by volume
 * @access  Admin
 */
router.get('/dashboard/users/top', adminDashboardController.getTopUsers);

/**
 * @route   GET /api/admin/dashboard/paymaster/metrics
 * @desc    Get paymaster metrics
 * @access  Admin
 */
router.get('/dashboard/paymaster/metrics', adminDashboardController.getPaymasterMetrics);

/**
 * @route   GET /api/admin/dashboard/activity/recent
 * @desc    Get recent activity
 * @access  Admin
 */
router.get('/dashboard/activity/recent', adminDashboardController.getRecentActivity);

// -----------------------------------------------------------------------------
// User Management Routes
// -----------------------------------------------------------------------------

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin (requires USER_READ permission)
 */
router.get('/users', requirePermission('USER_READ', 'USER_MANAGE'), adminUserController.getUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user by ID
 * @access  Admin (requires USER_READ permission)
 */
router.get('/users/:userId', requirePermission('USER_READ', 'USER_MANAGE'), adminUserController.getUserById);

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    Suspend user
 * @access  Admin (requires USER_MANAGE permission)
 */
router.post('/users/:userId/suspend', requirePermission('USER_MANAGE'), adminUserController.suspendUser);

/**
 * @route   POST /api/admin/users/:userId/unsuspend
 * @desc    Unsuspend user
 * @access  Admin (requires USER_MANAGE permission)
 */
router.post('/users/:userId/unsuspend', requirePermission('USER_MANAGE'), adminUserController.unsuspendUser);

/**
 * @route   POST /api/admin/users/:userId/flag
 * @desc    Flag user
 * @access  Admin (requires USER_MANAGE permission)
 */
router.post('/users/:userId/flag', requirePermission('USER_MANAGE'), adminUserController.flagUser);

/**
 * @route   PUT /api/admin/users/:userId/kyc
 * @desc    Update user KYC status
 * @access  Admin (requires KYC_MANAGE permission)
 */
router.put('/users/:userId/kyc', requirePermission('KYC_MANAGE'), adminUserController.updateKYCStatus);

/**
 * @route   PUT /api/admin/users/:userId/limits
 * @desc    Update user limits
 * @access  Admin (requires USER_MANAGE permission)
 */
router.put('/users/:userId/limits', requirePermission('USER_MANAGE'), adminUserController.updateUserLimits);

/**
 * @route   POST /api/admin/users/:userId/notes
 * @desc    Add admin note to user
 * @access  Admin
 */
router.post('/users/:userId/notes', adminUserController.addAdminNote);

/**
 * @route   GET /api/admin/users/:userId/notes
 * @desc    Get user admin notes
 * @access  Admin
 */
router.get('/users/:userId/notes', adminUserController.getUserNotes);

// -----------------------------------------------------------------------------
// Transaction Management Routes
// -----------------------------------------------------------------------------

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with filters
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getTransactions);

/**
 * @route   GET /api/admin/transactions/failed
 * @desc    Get failed transactions
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/failed', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getFailedTransactions);

/**
 * @route   GET /api/admin/transactions/pending
 * @desc    Get pending transactions
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/pending', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getPendingTransactions);

/**
 * @route   GET /api/admin/transactions/high-value
 * @desc    Get high value transactions
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/high-value', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getHighValueTransactions);

/**
 * @route   GET /api/admin/transactions/export
 * @desc    Export transactions
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/export', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.exportTransactions);

/**
 * @route   GET /api/admin/transactions/userop/:userOpHash
 * @desc    Get user operation details
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/userop/:userOpHash', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getUserOperation);

/**
 * @route   GET /api/admin/transactions/user/:userId/stats
 * @desc    Get user transaction stats
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/user/:userId/stats', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getUserStats);

/**
 * @route   GET /api/admin/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Admin (requires TRANSACTION_READ permission)
 */
router.get('/transactions/:transactionId', requirePermission('TRANSACTION_READ', 'TRANSACTION_MANAGE'), adminTransactionController.getTransactionById);

/**
 * @route   PUT /api/admin/transactions/:transactionId/status
 * @desc    Update transaction status
 * @access  Admin (requires TRANSACTION_MANAGE permission)
 */
router.put('/transactions/:transactionId/status', requirePermission('TRANSACTION_MANAGE'), adminTransactionController.updateStatus);

/**
 * @route   POST /api/admin/transactions/:transactionId/flag
 * @desc    Flag transaction
 * @access  Admin (requires TRANSACTION_MANAGE permission)
 */
router.post('/transactions/:transactionId/flag', requirePermission('TRANSACTION_MANAGE'), adminTransactionController.flagTransaction);

/**
 * @route   POST /api/admin/transactions/:transactionId/retry
 * @desc    Retry failed transaction
 * @access  Admin (requires TRANSACTION_MANAGE permission)
 */
router.post('/transactions/:transactionId/retry', requirePermission('TRANSACTION_MANAGE'), adminTransactionController.retryTransaction);

export default router;
