// src/routes/index.ts

import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);

// More routes will be added here:
// router.use('/users', userRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/payments', emailPaymentRoutes);
// router.use('/wallets', walletRoutes);

export default router;
