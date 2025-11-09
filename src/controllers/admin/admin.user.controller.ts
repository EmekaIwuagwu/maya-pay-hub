// src/controllers/admin/admin.user.controller.ts

import { Request, Response } from 'express';
import adminUserService from '../../services/admin/admin.user.service';
import adminAuthService from '../../services/admin/admin.auth.service';
import { asyncHandler } from '../../utils/helpers';
import { ValidationError } from '../../utils/errors';

class AdminUserController {
  /**
   * Get all users with filters
   * GET /api/admin/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string,
      kycStatus: req.query.kycStatus as string,
      isSuspended: req.query.isSuspended === 'true',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await adminUserService.getUsers(filters);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get user by ID
   * GET /api/admin/users/:userId
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await adminUserService.getUserById(userId);

    res.json({
      success: true,
      data: user,
    });
  });

  /**
   * Suspend user
   * POST /api/admin/users/:userId/suspend
   */
  suspendUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!reason) {
      throw new ValidationError('Suspension reason is required');
    }

    const result = await adminUserService.suspendUser(userId, reason, adminId);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'USER_SUSPENDED',
      'User',
      userId,
      { reason }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Unsuspend user
   * POST /api/admin/users/:userId/unsuspend
   */
  unsuspendUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const adminId = (req as any).admin.adminId;

    const result = await adminUserService.unsuspendUser(userId);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'USER_UNSUSPENDED',
      'User',
      userId
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Flag user
   * POST /api/admin/users/:userId/flag
   */
  flagUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason, severity } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!reason || !severity) {
      throw new ValidationError('Reason and severity are required');
    }

    const result = await adminUserService.flagUser(userId, adminId, reason, severity);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'USER_FLAGGED',
      'User',
      userId,
      { reason, severity }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Update user KYC status
   * PUT /api/admin/users/:userId/kyc
   */
  updateKYCStatus = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { status, tier, notes } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!status) {
      throw new ValidationError('KYC status is required');
    }

    const result = await adminUserService.updateKYCStatus(userId, status, tier, notes);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'KYC_STATUS_UPDATED',
      'User',
      userId,
      { status, tier, notes }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Update user limits
   * PUT /api/admin/users/:userId/limits
   */
  updateUserLimits = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { dailyLimit, monthlyLimit } = req.body;
    const adminId = (req as any).admin.adminId;

    const result = await adminUserService.updateUserLimits(userId, dailyLimit, monthlyLimit);

    // Log audit
    await adminAuthService.logAudit(
      adminId,
      'USER_LIMITS_UPDATED',
      'User',
      userId,
      { dailyLimit, monthlyLimit }
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Add admin note to user
   * POST /api/admin/users/:userId/notes
   */
  addAdminNote = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { note } = req.body;
    const adminId = (req as any).admin.adminId;

    if (!note) {
      throw new ValidationError('Note content is required');
    }

    const result = await adminUserService.addAdminNote(userId, adminId, note);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get user admin notes
   * GET /api/admin/users/:userId/notes
   */
  getUserNotes = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const notes = await adminUserService.getUserNotes(userId);

    res.json({
      success: true,
      data: notes,
    });
  });
}

export default new AdminUserController();
