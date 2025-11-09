// src/controllers/transaction.controller.ts

import { Request, Response, NextFunction } from 'express';
import transactionService from '../services/transaction.service';
import { logger } from '../utils/logger';

class TransactionController {
  /**
   * Send USDC transaction
   */
  async sendTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        recipientAddress,
        amount,
        referenceNote,
        useEscrow,
      } = req.body;

      const result = await transactionService.sendTransaction({
        userId,
        recipientAddress,
        amount,
        referenceNote,
        useEscrow,
      });

      res.json({
        success: true,
        message: 'Transaction initiated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { transactionId } = req.params;

      const transaction = await transactionService.getTransactionById(transactionId, userId);

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        status,
        type,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const result = await transactionService.getTransactionHistory(userId, {
        status: status as string,
        type: type as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';

      const stats = await transactionService.getTransactionStats(userId, period);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { transactionId } = req.params;

      const transaction = await transactionService.cancelTransaction(transactionId, userId);

      res.json({
        success: true,
        message: 'Transaction cancelled',
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TransactionController();
