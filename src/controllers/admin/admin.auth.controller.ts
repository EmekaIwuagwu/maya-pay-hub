// src/controllers/admin/admin.auth.controller.ts

import { Request, Response, NextFunction } from 'express';
import adminAuthService from '../../services/admin/admin.auth.service';
import { asyncHandler } from '../../utils/helpers';
import { ValidationError } from '../../utils/errors';

class AdminAuthController {
  /**
   * Admin login
   * POST /api/admin/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, totpToken } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await adminAuthService.login(email, password, totpToken);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Setup 2FA
   * POST /api/admin/auth/2fa/setup
   */
  setup2FA = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.adminId;

    const result = await adminAuthService.setup2FA(adminId);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Verify and enable 2FA
   * POST /api/admin/auth/2fa/verify
   */
  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.adminId;
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('2FA token is required');
    }

    const result = await adminAuthService.verify2FA(adminId, token);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get current admin profile
   * GET /api/admin/auth/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.adminId;

    const admin = await adminAuthService.getAdminById(adminId);

    res.json({
      success: true,
      data: admin,
    });
  });

  /**
   * Update admin password
   * PUT /api/admin/auth/password
   */
  updatePassword = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.adminId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ValidationError('Old and new passwords are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const result = await adminAuthService.updatePassword(adminId, oldPassword, newPassword);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Create new admin (super admin only)
   * POST /api/admin/auth/create
   */
  createAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role, permissions } = req.body;

    if (!email || !password || !fullName || !role) {
      throw new ValidationError('Email, password, full name, and role are required');
    }

    const result = await adminAuthService.createAdmin({
      email,
      password,
      fullName,
      role,
      permissions: permissions || [],
    });

    // Log audit
    await adminAuthService.logAudit(
      (req as any).admin.adminId,
      'ADMIN_CREATED',
      'Admin',
      result.id,
      { email, role, permissions }
    );

    res.json({
      success: true,
      data: result,
    });
  });
}

export default new AdminAuthController();
