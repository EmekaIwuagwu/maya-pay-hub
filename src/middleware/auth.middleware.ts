// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

/**
 * Authenticate user via JWT token
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.isSuspended) {
      throw new UnauthorizedError('Account suspended');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account inactive');
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error: any) {
    logger.warn('Authentication failed:', error.message);
    next(new UnauthorizedError('Invalid token'));
  }
}

/**
 * Authenticate via Web3Auth session
 */
export async function authenticateWeb3Auth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Find Web3Auth session
    const session = await prisma.web3AuthSession.findUnique({
      where: { sessionId: token },
      include: {
        user: {
          include: {
            smartAccounts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!session || !session.isActive || new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    // Update last activity
    await prisma.web3AuthSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    // Attach user and session to request
    req.user = session.user;
    req.session = session;

    next();
  } catch (error: any) {
    logger.warn('Web3Auth authentication failed:', error.message);
    next(new UnauthorizedError('Invalid session'));
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          smartAccounts: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      });

      if (user && !user.isSuspended && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * Check if user has required KYC tier
 */
export function requireKYCTier(minTier: 'BASIC' | 'VERIFIED' | 'BUSINESS') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const tierLevels = {
      BASIC: 1,
      VERIFIED: 2,
      BUSINESS: 3,
    };

    const userTierLevel = tierLevels[req.user.kycTier as keyof typeof tierLevels] || 0;
    const requiredTierLevel = tierLevels[minTier];

    if (userTierLevel < requiredTierLevel) {
      return next(new UnauthorizedError(`KYC verification required: ${minTier}`));
    }

    next();
  };
}
