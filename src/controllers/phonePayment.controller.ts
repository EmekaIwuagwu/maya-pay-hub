// src/controllers/phonePayment.controller.ts

import { Request, Response, NextFunction } from 'express';
import phonePaymentService from '../services/phonePayment.service';
import { logger } from '../utils/logger';

class PhonePaymentController {
  /**
   * Send payment to phone number
   */
  async sendPhonePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        recipientPhone,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      } = req.body;

      const result = await phonePaymentService.sendPhonePayment({
        userId,
        recipientPhone,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      });

      res.json({
        success: true,
        message: 'Payment sent via SMS',
        data: {
          phonePayment: result.phonePayment,
          transaction: result.transaction,
          claimUrl: result.claimUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Claim phone payment
   */
  async claimPhonePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;

      const phonePayment = await phonePaymentService.claimPhonePayment(paymentId, userId);

      res.json({
        success: true,
        message: 'Payment claimed successfully',
        data: phonePayment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get phone payment by tracking ID (public - for claim page)
   */
  async getPhonePaymentByTrackingId(req: Request, res: Response, next: NextFunction) {
    try {
      const { trackingId } = req.params;

      const phonePayment = await phonePaymentService.getPhonePaymentByTrackingId(trackingId);

      res.json({
        success: true,
        data: phonePayment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sent phone payments
   */
  async getSentPhonePayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await phonePaymentService.getSentPhonePayments(userId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get received phone payments
   */
  async getReceivedPhonePayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await phonePaymentService.getReceivedPhonePayments(userId, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel phone payment
   */
  async cancelPhonePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;
      const { reason } = req.body;

      const phonePayment = await phonePaymentService.cancelPhonePayment(
        paymentId,
        userId,
        reason
      );

      res.json({
        success: true,
        message: 'Payment cancelled successfully',
        data: phonePayment,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PhonePaymentController();
