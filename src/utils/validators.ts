// src/utils/validators.ts

import { ethers } from 'ethers';

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Validate USDC amount (must be positive and max 6 decimals)
 */
export function isValidUSDCAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num) || num <= 0) {
    return false;
  }

  // Check decimal places (max 6 for USDC)
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
  return decimalPlaces <= 6;
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * Validate date of birth (user must be 18+)
 */
export function isValidDateOfBirth(dob: Date): boolean {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 18;
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 */
export function isValidCountryCode(code: string): boolean {
  const countryCodeRegex = /^[A-Z]{2}$/;
  return countryCodeRegex.test(code);
}

/**
 * Validate currency code (ISO 4217)
 */
export function isValidCurrencyCode(code: string): boolean {
  const currencyCodeRegex = /^[A-Z]{3}$/;
  return currencyCodeRegex.test(code);
}
