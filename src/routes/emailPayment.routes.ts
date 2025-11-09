// src/routes/emailPayment.routes.ts

import { Router } from 'express';
import emailPaymentController from '../controllers/emailPayment.controller';
import phonePaymentController from '../controllers/phonePayment.controller';
import { authenticateUser, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// ============================================================================
// EMAIL PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/payments/email
 * @desc    Send payment to email
 * @access  Private
 */
router.post('/email', authenticateUser, emailPaymentController.sendEmailPayment);

/**
 * @route   GET /api/payments/email/sent
 * @desc    Get sent email payments
 * @access  Private
 */
router.get('/email/sent', authenticateUser, emailPaymentController.getSentEmailPayments);

/**
 * @route   GET /api/payments/email/received
 * @desc    Get received email payments
 * @access  Private
 */
router.get('/email/received', authenticateUser, emailPaymentController.getReceivedEmailPayments);

/**
 * @route   GET /api/payments/claim/email/:trackingId
 * @desc    Get email payment by tracking ID (public - for claim page)
 * @access  Public
 */
router.get('/claim/email/:trackingId', emailPaymentController.getEmailPaymentByTrackingId);

/**
 * @route   POST /api/payments/email/:paymentId/claim
 * @desc    Claim email payment
 * @access  Private
 */
router.post('/email/:paymentId/claim', authenticateUser, emailPaymentController.claimEmailPayment);

/**
 * @route   POST /api/payments/email/:paymentId/cancel
 * @desc    Cancel email payment
 * @access  Private
 */
router.post('/email/:paymentId/cancel', authenticateUser, emailPaymentController.cancelEmailPayment);

/**
 * @route   GET /api/payments/track/:trackingId/:eventType
 * @desc    Track email event (pixel tracking)
 * @access  Public
 */
router.get('/track/:trackingId/:eventType', emailPaymentController.trackEmailEvent);

// ============================================================================
// PHONE PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/payments/phone
 * @desc    Send payment to phone number
 * @access  Private
 */
router.post('/phone', authenticateUser, phonePaymentController.sendPhonePayment);

/**
 * @route   GET /api/payments/phone/sent
 * @desc    Get sent phone payments
 * @access  Private
 */
router.get('/phone/sent', authenticateUser, phonePaymentController.getSentPhonePayments);

/**
 * @route   GET /api/payments/phone/received
 * @desc    Get received phone payments
 * @access  Private
 */
router.get('/phone/received', authenticateUser, phonePaymentController.getReceivedPhonePayments);

/**
 * @route   GET /api/payments/claim/phone/:trackingId
 * @desc    Get phone payment by tracking ID (public - for claim page)
 * @access  Public
 */
router.get('/claim/phone/:trackingId', phonePaymentController.getPhonePaymentByTrackingId);

/**
 * @route   POST /api/payments/phone/:paymentId/claim
 * @desc    Claim phone payment
 * @access  Private
 */
router.post('/phone/:paymentId/claim', authenticateUser, phonePaymentController.claimPhonePayment);

/**
 * @route   POST /api/payments/phone/:paymentId/cancel
 * @desc    Cancel phone payment
 * @access  Private
 */
router.post('/phone/:paymentId/cancel', authenticateUser, phonePaymentController.cancelPhonePayment);

// ============================================================================
// LEGACY ROUTES (for backward compatibility)
// ============================================================================

/**
 * @route   POST /api/payments/:paymentId/claim
 * @desc    Claim email payment (legacy route)
 * @access  Private
 */
router.post('/:paymentId/claim', authenticateUser, emailPaymentController.claimEmailPayment);

/**
 * @route   POST /api/payments/:paymentId/cancel
 * @desc    Cancel email payment (legacy route)
 * @access  Private
 */
router.post('/:paymentId/cancel', authenticateUser, emailPaymentController.cancelEmailPayment);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get email payment by ID (legacy route)
 * @access  Private
 */
router.get('/:paymentId', authenticateUser, emailPaymentController.getEmailPayment);

/**
 * @route   GET /api/payments
 * @desc    Get email payments (legacy route)
 * @access  Private
 */
router.get('/', authenticateUser, emailPaymentController.getEmailPayments);

export default router;
