// src/middleware/admin.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import adminAuthService from '../services/admin/admin.auth.service';
import { logger } from '../utils/logger';

interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Verify admin JWT token
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No admin token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.adminJwt.secret) as AdminJwtPayload;

    // Get admin details
    const admin = await adminAuthService.getAdminById(decoded.adminId);

    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }

    if (admin.isSuspended) {
      throw new UnauthorizedError('Admin account suspended');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account inactive');
    }

    // Attach admin to request
    (req as any).admin = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid admin token'));
    } else {
      next(error);
    }
  }
};

/**
 * Check if admin has specific role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as any).admin;

    if (!admin) {
      return next(new UnauthorizedError('Admin not authenticated'));
    }

    if (!roles.includes(admin.role)) {
      logger.warn(`Admin ${admin.adminId} attempted to access role-restricted resource`);
      return next(
        new ForbiddenError(`Requires one of the following roles: ${roles.join(', ')}`)
      );
    }

    next();
  };
};

/**
 * Check if admin has specific permission
 */
export const requirePermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = (req as any).admin;

      if (!admin) {
        return next(new UnauthorizedError('Admin not authenticated'));
      }

      // Super admin has all permissions
      if (admin.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check if admin has at least one of the required permissions
      const hasPermission = permissions.some(permission =>
        admin.permissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn(
          `Admin ${admin.adminId} attempted to access permission-restricted resource. Required: ${permissions.join(', ')}`
        );
        return next(
          new ForbiddenError(`Requires one of the following permissions: ${permissions.join(', ')}`)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if admin has all specified permissions
 */
export const requireAllPermissions = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = (req as any).admin;

      if (!admin) {
        return next(new UnauthorizedError('Admin not authenticated'));
      }

      // Super admin has all permissions
      if (admin.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check if admin has all required permissions
      const hasAllPermissions = permissions.every(permission =>
        admin.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        logger.warn(
          `Admin ${admin.adminId} attempted to access permission-restricted resource. Required all: ${permissions.join(', ')}`
        );
        return next(
          new ForbiddenError(`Requires all of the following permissions: ${permissions.join(', ')}`)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Admin or moderator middleware
 */
export const requireAdminOrModerator = requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

export default {
  authenticateAdmin,
  requireRole,
  requirePermission,
  requireAllPermissions,
  requireSuperAdmin,
  requireAdminOrModerator,
};
