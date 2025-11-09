// src/utils/helpers.ts

import crypto from 'crypto';
import { config } from '../config';

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a unique tracking ID
 */
export function generateTrackingId(): string {
  return `${Date.now()}-${generateRandomString(16)}`;
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

/**
 * Calculate fee based on amount
 */
export function calculateFee(amount: number, feePercentage: number): number {
  return (amount * feePercentage) / 100;
}

/**
 * Calculate total with fee
 */
export function calculateTotalWithFee(amount: number, feePercentage: number): number {
  const fee = calculateFee(amount, feePercentage);
  return amount + fee;
}

/**
 * Truncate Ethereum address for display
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Parse pagination parameters
 */
export function parsePagination(page?: string, limit?: string) {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '20', 10);

  return {
    skip: (pageNum - 1) * limitNum,
    take: Math.min(limitNum, 100), // Max 100 items per page
    page: pageNum,
    limit: limitNum,
  };
}

/**
 * Create pagination response
 */
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Mask sensitive data
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * Mask card number
 */
export function maskCardNumber(cardNumber: string): string {
  return `****${cardNumber.slice(-4)}`;
}

/**
 * Get time until date in human-readable format
 */
export function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Check if date is expired
 */
export function isExpired(date: Date): boolean {
  return new Date() > date;
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(config.encryption.key, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(config.encryption.key, 'hex');

  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash data using SHA256
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compare hash
 */
export function compareHash(data: string, hashedData: string): boolean {
  return hash(data) === hashedData;
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Add + prefix if not present
  if (!phone.startsWith('+')) {
    // Assume US/Canada number if 10 digits
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      // Add + prefix for international numbers
      cleaned = '+' + cleaned;
    }
  } else {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Mask phone number for display
 */
export function maskPhoneNumber(phone: string): string {
  // Format: +1 (234) ***-**89
  if (phone.length < 4) {
    return phone;
  }

  const lastDigits = phone.slice(-2);
  const firstDigits = phone.slice(0, phone.length - 6);
  const masked = phone.slice(phone.length - 6, phone.length - 2).replace(/\d/g, '*');

  return `${firstDigits}${masked}${lastDigits}`;
}
