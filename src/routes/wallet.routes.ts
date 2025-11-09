// src/routes/wallet.routes.ts

import { Router } from 'express';
import walletController from '../controllers/wallet.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/wallets
 * @desc    Get wallet details
 * @access  Private
 */
router.get('/', walletController.getWallet);

/**
 * @route   GET /api/wallets/balance
 * @desc    Get wallet balance
 * @access  Private
 */
router.get('/balance', walletController.getBalance);

/**
 * @route   GET /api/wallets/nonce
 * @desc    Get wallet nonce
 * @access  Private
 */
router.get('/nonce', walletController.getNonce);

/**
 * @route   GET /api/wallets/gas-prices
 * @desc    Get current gas prices
 * @access  Private
 */
router.get('/gas-prices', walletController.getGasPrices);

/**
 * @route   POST /api/wallets/estimate
 * @desc    Estimate transaction cost
 * @access  Private
 */
router.post('/estimate', walletController.estimateTransactionCost);

/**
 * @route   GET /api/wallets/deployment-status
 * @desc    Check if wallet needs deployment
 * @access  Private
 */
router.get('/deployment-status', walletController.checkDeploymentStatus);

export default router;
