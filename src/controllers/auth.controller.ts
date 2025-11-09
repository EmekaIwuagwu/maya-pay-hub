// src/controllers/auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import web3authService from '../services/web3auth.service';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';

class AuthController {
  /**
   * Login with Web3Auth
   */
  async loginWithWeb3Auth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, provider, verifierId, publicKey } = req.body;

      if (!idToken || !provider || !verifierId || !publicKey) {
        throw new ValidationError('Missing required fields');
      }

      // Authenticate user via Web3Auth
      const result = await web3authService.authenticateUser({
        idToken,
        provider,
        verifierId,
        publicKey,
      });

      // Generate JWT for API access
      const token = jwt.sign(
        { userId: result.user.id, email: result.user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { userId: result.user.id, type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      logger.info(`User logged in: ${result.user.email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            kycStatus: result.user.kycStatus,
            kycTier: result.user.kycTier,
          },
          smartAccount: result.smartAccount,
          isNewUser: result.isNewUser,
          pendingPayments: result.pendingPayments,
          token,
          refreshToken,
          web3AuthSession: result.session.sessionId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token required');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

      if (decoded.type !== 'refresh') {
        throw new ValidationError('Invalid refresh token');
      }

      // Generate new access token
      const token = jwt.sign(
        { userId: decoded.userId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        success: true,
        data: { token },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.body;

      if (sessionId) {
        await web3authService.logout(sessionId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ValidationError('User not found');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            fullName: req.user.fullName,
            phoneNumber: req.user.phoneNumber,
            kycStatus: req.user.kycStatus,
            kycTier: req.user.kycTier,
            country: req.user.country,
            currency: req.user.currency,
            createdAt: req.user.createdAt,
          },
          smartAccount: req.user.smartAccounts[0],
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
