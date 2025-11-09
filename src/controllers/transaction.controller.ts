// src/controllers/transaction.controller.ts

import { Request, Response, NextFunction } from 'express';
import transactionService from '../services/transaction.service';
import unifiedSendService from '../services/unifiedSend.service';
import { logger } from '../utils/logger';

class TransactionController {
  /**
   * Unified send (auto-detect wallet/email/phone)
   */
  async unifiedSend(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        recipient,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      } = req.body;

      const result = await unifiedSendService.send({
        userId,
        recipient,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      });

      res.json({
        success: true,
        message: result.message,
        data: result.data,
        recipientType: result.type,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview send (detect recipient type)
   */
  async previewSend(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipient } = req.query;

      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: 'Recipient is required',
        });
      }

      const preview = await unifiedSendService.previewSend(recipient as string);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send USDC transaction (direct to wallet address)
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
