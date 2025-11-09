// src/routes/emailPayment.routes.ts

import { Router } from 'express';
import emailPaymentController from '../controllers/emailPayment.controller';
import { authenticateUser, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/payments/email
 * @desc    Send payment to email
 * @access  Private
 */
router.post('/email', authenticateUser, emailPaymentController.sendEmailPayment);

/**
 * @route   POST /api/payments/:paymentId/claim
 * @desc    Claim email payment
 * @access  Private
 */
router.post('/:paymentId/claim', authenticateUser, emailPaymentController.claimEmailPayment);

/**
 * @route   POST /api/payments/:paymentId/cancel
 * @desc    Cancel email payment
 * @access  Private
 */
router.post('/:paymentId/cancel', authenticateUser, emailPaymentController.cancelEmailPayment);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get email payment by ID
 * @access  Private
 */
router.get('/:paymentId', authenticateUser, emailPaymentController.getEmailPayment);

/**
 * @route   GET /api/payments
 * @desc    Get email payments
 * @access  Private
 */
router.get('/', authenticateUser, emailPaymentController.getEmailPayments);

/**
 * @route   GET /api/payments/track/:trackingId/:eventType
 * @desc    Track email event (pixel tracking)
 * @access  Public
 */
router.get('/track/:trackingId/:eventType', emailPaymentController.trackEmailEvent);

export default router;
