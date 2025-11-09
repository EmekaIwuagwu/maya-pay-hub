// src/routes/transaction.routes.ts

import { Router } from 'express';
import transactionController from '../controllers/transaction.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   POST /api/transactions/send
 * @desc    Send USDC transaction
 * @access  Private
 */
router.post('/send', transactionController.sendTransaction);

/**
 * @route   GET /api/transactions/:transactionId
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:transactionId', transactionController.getTransaction);

/**
 * @route   GET /api/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/', transactionController.getTransactionHistory);

/**
 * @route   GET /api/transactions/stats
 * @desc    Get transaction statistics
 * @access  Private
 */
router.get('/stats/summary', transactionController.getTransactionStats);

/**
 * @route   POST /api/transactions/:transactionId/cancel
 * @desc    Cancel transaction
 * @access  Private
 */
router.post('/:transactionId/cancel', transactionController.cancelTransaction);

export default router;
