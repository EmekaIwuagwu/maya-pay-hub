// src/utils/constants.ts

/**
 * Application-wide constants
 */

export const USDC_DECIMALS = 6;
export const ETH_DECIMALS = 18;

export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  IN_ESCROW: 'IN_ESCROW',
  WAITING_CLAIM: 'WAITING_CLAIM',
  FLAGGED: 'FLAGGED',
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export const TRANSACTION_TYPE = {
  SEND: 'SEND',
  RECEIVE: 'RECEIVE',
  ESCROW_CREATE: 'ESCROW_CREATE',
  ESCROW_RELEASE: 'ESCROW_RELEASE',
  WITHDRAWAL: 'WITHDRAWAL',
  DEPOSIT: 'DEPOSIT',
  EMAIL_PAYMENT: 'EMAIL_PAYMENT',
  EMAIL_CLAIM: 'EMAIL_CLAIM',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export const EMAIL_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  OPENED: 'OPENED',
  CLICKED: 'CLICKED',
  REGISTERED: 'REGISTERED',
  CLAIMED: 'CLAIMED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export const KYC_STATUS = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

export const KYC_TIER = {
  BASIC: 'BASIC',
  VERIFIED: 'VERIFIED',
  BUSINESS: 'BUSINESS',
} as const;

export const ESCROW_STATUS = {
  ACTIVE: 'ACTIVE',
  RELEASED: 'RELEASED',
  DISPUTED: 'DISPUTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  WAITING_REGISTRATION: 'WAITING_REGISTRATION',
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export const ADMIN_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  COMPLIANCE: 'COMPLIANCE',
  FINANCE: 'FINANCE',
  ANALYST: 'ANALYST',
} as const;

export const WEB3AUTH_PROVIDER = {
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  TWITTER: 'TWITTER',
  APPLE: 'APPLE',
  EMAIL_PASSWORDLESS: 'EMAIL_PASSWORDLESS',
  SMS: 'SMS',
  DISCORD: 'DISCORD',
  TWITCH: 'TWITCH',
} as const;

export const GAS_STRATEGY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  INSTANT: 'instant',
} as const;

// Cache keys
export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  SMART_ACCOUNT: (accountId: string) => `smart_account:${accountId}`,
  TRANSACTION: (txId: string) => `transaction:${txId}`,
  EMAIL_PAYMENT: (emailPaymentId: string) => `email_payment:${emailPaymentId}`,
  GAS_PRICE: 'gas_price',
  ETH_PRICE: 'eth_price',
  USDC_PRICE: 'usdc_price',
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  SMART_ACCOUNT: 300, // 5 minutes
  TRANSACTION: 60, // 1 minute
  GAS_PRICE: 30, // 30 seconds
  PRICE_FEED: 60, // 1 minute
} as const;

// Rate limits
export const RATE_LIMITS = {
  SEND_PAYMENT: {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
  },
  EMAIL_PAYMENT: {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
  },
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  },
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  MAGIC_LINK: 'magicLink',
  PAYMENT_RECEIVED: 'paymentReceived',
  PAYMENT_WAITING: 'paymentWaiting',
  PAYMENT_CLAIMED: 'paymentClaimed',
  PAYMENT_SENT: 'paymentSent',
  CLAIM_REMINDER: 'claimReminder',
  PAYMENT_EXPIRING: 'paymentExpiring',
  PAYMENT_REFUNDED: 'paymentRefunded',
} as const;

// Supported countries
export const SUPPORTED_COUNTRIES = [
  'US', 'GB', 'CA', 'NG', 'KE', 'GH', 'ZA', 'EU',
] as const;

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR',
] as const;

// Blockchain confirmations required
export const CONFIRMATIONS_REQUIRED = 1; // Base has fast finality

// Default expiration for email payments (days)
export const EMAIL_PAYMENT_EXPIRATION_DAYS = 30;

// Maximum transaction amount limits (USDC)
export const MAX_TRANSACTION_LIMITS = {
  UNVERIFIED: 100,
  BASIC: 1000,
  VERIFIED: 10000,
  BUSINESS: 100000,
} as const;

export default {
  USDC_DECIMALS,
  ETH_DECIMALS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  EMAIL_PAYMENT_STATUS,
  KYC_STATUS,
  KYC_TIER,
  ESCROW_STATUS,
  ADMIN_ROLE,
  WEB3AUTH_PROVIDER,
  GAS_STRATEGY,
  CACHE_KEYS,
  CACHE_TTL,
  RATE_LIMITS,
  EMAIL_TEMPLATES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  CONFIRMATIONS_REQUIRED,
  EMAIL_PAYMENT_EXPIRATION_DAYS,
  MAX_TRANSACTION_LIMITS,
};
