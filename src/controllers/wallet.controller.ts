// src/controllers/wallet.controller.ts

import { Request, Response, NextFunction } from 'express';
import smartAccountService from '../services/smartAccount.service';
import blockchainService from '../services/blockchain.service';
import { logger } from '../utils/logger';

class WalletController {
  /**
   * Get wallet details
   */
  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);

      if (!smartAccount) {
        return res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
      }

      res.json({
        success: true,
        data: {
          address: smartAccount.accountAddress,
          isDeployed: smartAccount.isDeployed,
          network: smartAccount.network,
          chainId: smartAccount.chainId,
          paymasterEnabled: smartAccount.paymasterEnabled,
          createdAt: smartAccount.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);

      if (!smartAccount) {
        return res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
      }

      const balance = await smartAccountService.getSmartAccountBalance(smartAccount.id);

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet nonce
   */
  async getNonce(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);

      if (!smartAccount) {
        return res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
      }

      const nonce = await smartAccountService.getNonce(smartAccount.accountAddress);

      res.json({
        success: true,
        data: {
          nonce: nonce.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get gas prices
   */
  async getGasPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const gasPrices = await blockchainService.getGasPrices();

      res.json({
        success: true,
        data: gasPrices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Estimate transaction cost
   */
  async estimateTransactionCost(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({
          success: false,
          error: 'Amount required',
        });
      }

      const estimate = await blockchainService.estimateTransactionCost(amount);

      res.json({
        success: true,
        data: estimate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if wallet needs deployment
   */
  async checkDeploymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const smartAccount = await smartAccountService.getSmartAccountByUserId(userId);

      if (!smartAccount) {
        return res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
      }

      const needsDeployment = await smartAccountService.needsDeployment(smartAccount.id);

      res.json({
        success: true,
        data: {
          needsDeployment,
          isDeployed: smartAccount.isDeployed,
          address: smartAccount.accountAddress,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WalletController();
