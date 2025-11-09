// src/controllers/admin/admin.transaction.controller.ts

import { Request, Response } from 'express';
import adminTransactionService from '../../services/admin/admin.transaction.service';
import adminAuthService from '../../services/admin/admin.auth.service';
import { asyncHandler } from '../../utils/helpers';
import { ValidationError } from '../../utils/errors';

class AdminTransactionController {
  /**
   * Get all transactions with filters
   * GET /api/admin/transactions
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string,
      status: req.query.status as string,
      transactionType: req.query.transactionType as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      minAmount: req.query.minAmount as string,
      maxAmount: req.query.maxAmount as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await adminTransactionService.getTransactions(filters);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get transaction by ID
   * GET /api/admin/transactions/:transactionId
   */
  getTransactionById = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;

    const transaction = await adminTransactionService.getTransactionById(transactionId);

    res.json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Update transaction status
   * PUT /api/admin/transactions/:transactionId/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const { status, notes } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!status) {
      throw new ValidationError('Status is required');
    }

    const result = await adminTransactionService.updateTransactionStatus(
      transactionId,
      status,
      adminId,
      notes
    );

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'TRANSACTION_STATUS_UPDATED',
      'Transaction',
      transactionId,
      { status, notes }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Flag transaction
   * POST /api/admin/transactions/:transactionId/flag
   */
  flagTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const { reason, severity } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!reason || !severity) {
      throw new ValidationError('Reason and severity are required');
    }

    const result = await adminTransactionService.flagTransaction(
      transactionId,
      adminId,
      reason,
      severity
    );

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'TRANSACTION_FLAGGED',
      'Transaction',
      transactionId,
      { reason, severity }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get failed transactions
   * GET /api/admin/transactions/failed
   */
  getFailedTransactions = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await adminTransactionService.getFailedTransactions(limit);

    res.json({
      success: true,
      data: transactions,
    });
  });

  /**
   * Get pending transactions
   * GET /api/admin/transactions/pending
   */
  getPendingTransactions = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await adminTransactionService.getPendingTransactions(limit);

    res.json({
      success: true,
      data: transactions,
    });
  });

  /**
   * Get high value transactions
   * GET /api/admin/transactions/high-value
   */
  getHighValueTransactions = asyncHandler(async (req: Request, res: Response) => {
    const threshold = req.query.threshold as string || '1000';
    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await adminTransactionService.getHighValueTransactions(threshold, limit);

    res.json({
      success: true,
      data: transactions,
    });
  });

  /**
   * Get user operation details
   * GET /api/admin/transactions/userop/:userOpHash
   */
  getUserOperation = asyncHandler(async (req: Request, res: Response) => {
    const { userOpHash } = req.params;

    const userOp = await adminTransactionService.getUserOperation(userOpHash);

    res.json({
      success: true,
      data: userOp,
    });
  });

  /**
   * Retry failed transaction
   * POST /api/admin/transactions/:transactionId/retry
   */
  retryTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const adminId = (req as any).admin.adminId;

    const result = await adminTransactionService.retryTransaction(transactionId, adminId);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'TRANSACTION_RETRIED',
      'Transaction',
      transactionId
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get user transaction stats
   * GET /api/admin/transactions/user/:userId/stats
   */
  getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const stats = await adminTransactionService.getUserTransactionStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Export transactions
   * GET /api/admin/transactions/export
   */
  exportTransactions = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      status: req.query.status as string,
    };

    const data = await adminTransactionService.exportTransactions(filters);

    res.json({
      success: true,
      data,
    });
  });
}

export default new AdminTransactionController();
