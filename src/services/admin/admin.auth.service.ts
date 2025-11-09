// src/services/admin/admin.auth.service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { UnauthorizedError, ValidationError } from '../../utils/errors';

class AdminAuthService {
  /**
   * Admin login with 2FA
   */
  async login(email: string, password: string, totpToken?: string) {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (admin.isSuspended) {
      throw new UnauthorizedError('Account suspended');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Account inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check 2FA
    if (admin.twoFactorEnabled || config.admin.twoFactorRequired) {
      if (!totpToken) {
        return {
          requiresTwoFactor: true,
          adminId: admin.id,
        };
      }

      if (!admin.twoFactorSecret) {
        throw new ValidationError('2FA not configured');
      }

      const isValid = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2,
      });

      if (!isValid) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Generate token
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
      config.adminJwt.secret,
      { expiresIn: config.adminJwt.expiresIn }
    );

    // Log audit
    await this.logAudit(admin.id, 'ADMIN_LOGIN', 'Admin', admin.id);

    logger.info(`Admin logged in: ${admin.email}`);

    return {
      requiresTwoFactor: false,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
      },
      token,
    };
  }

  /**
   * Setup 2FA for admin
   */
  async setup2FA(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }

    const secret = speakeasy.generateSecret({
      name: `Maya Pay Admin (${admin.email})`,
      length: 32,
    });

    // Store secret
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        twoFactorSecret: secret.base32,
      },
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url,
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verify2FA(adminId: string, token: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.twoFactorSecret) {
      throw new ValidationError('2FA not setup');
    }

    const isValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) {
      throw new ValidationError('Invalid 2FA code');
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        twoFactorEnabled: true,
      },
    });

    logger.info(`2FA enabled for admin: ${admin.email}`);

    return { success: true };
  }

  /**
   * Create admin user (super admin only)
   */
  async createAdmin(data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    permissions: string[];
  }) {
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ValidationError('Admin already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    const admin = await prisma.admin.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        role: data.role as any,
        permissions: data.permissions as any[],
        twoFactorEnabled: false,
      },
    });

    logger.info(`New admin created: ${admin.email}`);

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      permissions: admin.permissions,
    };
  }

  /**
   * Update admin password
   */
  async updatePassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid current password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash },
    });

    logger.info(`Password updated for admin: ${admin.email}`);

    return { success: true };
  }

  /**
   * Log audit action
   */
  async logAudit(
    adminId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    changes?: any,
    metadata?: any
  ) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: action as any,
        entityType,
        entityId,
        changes,
        metadata,
      },
    });
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        permissions: true,
        twoFactorEnabled: true,
        isActive: true,
        isSuspended: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }

    return admin;
  }

  /**
   * Verify admin has permission
   */
  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { role: true, permissions: true },
    });

    if (!admin) {
      return false;
    }

    // Super admin has all permissions
    if (admin.role === 'SUPER_ADMIN') {
      return true;
    }

    return admin.permissions.includes(permission as any);
  }
}

export default new AdminAuthService();
