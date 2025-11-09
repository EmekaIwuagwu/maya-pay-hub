// src/routes/index.ts

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import walletRoutes from './wallet.routes';
import transactionRoutes from './transaction.routes';
import emailPaymentRoutes from './emailPayment.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallets', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payments', emailPaymentRoutes);

export default router;
