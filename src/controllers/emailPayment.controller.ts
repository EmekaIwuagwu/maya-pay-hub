// src/controllers/emailPayment.controller.ts

import { Request, Response, NextFunction } from 'express';
import emailPaymentService from '../services/emailPayment.service';
import emailService from '../services/email.service';
import { logger } from '../utils/logger';
import { config } from '../config';

class EmailPaymentController {
  /**
   * Send payment to email
   */
  async sendEmailPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        recipientEmail,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      } = req.body;

      const result = await emailPaymentService.sendEmailPayment({
        userId,
        recipientEmail,
        amount,
        personalMessage,
        referenceNote,
        expirationDays,
      });

      // Send email notification
      const claimUrl = `${config.frontendUrl}/claim/${result.emailPayment.id}`;

      await emailService.sendEmailPaymentNotification({
        to: recipientEmail,
        senderName: req.user.fullName || req.user.email,
        amount,
        message: personalMessage,
        claimUrl,
        trackingId: result.trackingId,
        expiresAt: result.emailPayment.expiresAt,
      });

      res.json({
        success: true,
        message: 'Payment sent to email',
        data: {
          emailPayment: result.emailPayment,
          transaction: result.transaction,
          claimUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Claim email payment
   */
  async claimEmailPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;

      const emailPayment = await emailPaymentService.claimEmailPayment(paymentId, userId);

      res.json({
        success: true,
        message: 'Payment claimed successfully',
        data: emailPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel email payment
   */
  async cancelEmailPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;

      const emailPayment = await emailPaymentService.cancelEmailPayment(paymentId, userId);

      res.json({
        success: true,
        message: 'Payment cancelled',
        data: emailPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email payment by ID
   */
  async getEmailPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;

      const emailPayment = await emailPaymentService.getEmailPaymentById(paymentId, userId);

      res.json({
        success: true,
        data: emailPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email payments
   */
  async getEmailPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const {
        sent,
        received,
        status,
        page,
        limit,
      } = req.query;

      const result = await emailPaymentService.getEmailPayments(userId, {
        sent: sent === 'true',
        received: received === 'true',
        status: status as string,
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
   * Track email event (pixel tracking)
   */
  async trackEmailEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { trackingId, eventType } = req.params;

      await emailPaymentService.trackEmailEvent(trackingId, eventType, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    } catch (error) {
      // Don't expose errors for tracking pixels
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    }
  }
}

export default new EmailPaymentController();
