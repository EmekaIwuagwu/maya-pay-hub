// src/middleware/validation.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { isValidEmail, isValidEthereumAddress, isValidUSDCAmount } from '../utils/validators';

/**
 * Validate email payment request
 */
export function validateEmailPayment(req: Request, res: Response, next: NextFunction) {
  const { recipientEmail, amount } = req.body;

  if (!recipientEmail) {
    return next(new ValidationError('Recipient email is required'));
  }

  if (!isValidEmail(recipientEmail)) {
    return next(new ValidationError('Invalid email address'));
  }

  if (!amount) {
    return next(new ValidationError('Amount is required'));
  }

  if (!isValidUSDCAmount(amount)) {
    return next(new ValidationError('Invalid amount'));
  }

  next();
}

/**
 * Validate transaction request
 */
export function validateTransaction(req: Request, res: Response, next: NextFunction) {
  const { recipientAddress, amount } = req.body;

  if (!recipientAddress) {
    return next(new ValidationError('Recipient address is required'));
  }

  if (!isValidEthereumAddress(recipientAddress)) {
    return next(new ValidationError('Invalid recipient address'));
  }

  if (!amount) {
    return next(new ValidationError('Amount is required'));
  }

  if (!isValidUSDCAmount(amount)) {
    return next(new ValidationError('Invalid amount'));
  }

  next();
}

/**
 * Validate profile update
 */
export function validateProfileUpdate(req: Request, res: Response, next: NextFunction) {
  const { email, phoneNumber } = req.body;

  if (email && !isValidEmail(email)) {
    return next(new ValidationError('Invalid email address'));
  }

  if (phoneNumber && phoneNumber.length < 10) {
    return next(new ValidationError('Invalid phone number'));
  }

  next();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    return next(new ValidationError('Page must be greater than 0'));
  }

  if (limit < 1 || limit > 100) {
    return next(new ValidationError('Limit must be between 1 and 100'));
  }

  next();
}
