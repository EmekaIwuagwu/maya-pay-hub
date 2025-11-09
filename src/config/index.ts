// src/config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // App
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:5000',

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Admin JWT
  adminJwt: {
    secret: process.env.JWT_ADMIN_SECRET!,
    expiresIn: process.env.ADMIN_SESSION_TIMEOUT || '8h',
  },

  // Web3Auth
  web3auth: {
    clientId: process.env.WEB3AUTH_CLIENT_ID!,
    verifier: process.env.WEB3AUTH_VERIFIER || 'maya-auth-verifier',
    network: process.env.WEB3AUTH_NETWORK || 'mainnet',
    chainId: process.env.WEB3AUTH_CHAIN_ID || '8453',
    rpcTarget: process.env.WEB3AUTH_RPC_TARGET!,
    providers: {
      google: process.env.WEB3AUTH_ENABLE_GOOGLE === 'true',
      facebook: process.env.WEB3AUTH_ENABLE_FACEBOOK === 'true',
      twitter: process.env.WEB3AUTH_ENABLE_TWITTER === 'true',
      apple: process.env.WEB3AUTH_ENABLE_APPLE === 'true',
      email: process.env.WEB3AUTH_ENABLE_EMAIL === 'true',
      sms: process.env.WEB3AUTH_ENABLE_SMS === 'true',
    },
  },

  // Circle & Paymaster
  circle: {
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    apiBaseUrl: process.env.CIRCLE_API_BASE_URL || 'https://api.circle.com/v1',
    usdcContract: process.env.CIRCLE_USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },

  // Paymaster
  paymaster: {
    enabled: process.env.PAYMASTER_ENABLED === 'true',
    address: process.env.CIRCLE_PAYMASTER_ADDRESS!,
    sponsorNewUsers: process.env.PAYMASTER_GAS_SPONSOR_NEW_USERS === 'true',
    maxSponsorship: parseFloat(process.env.PAYMASTER_MAX_GAS_SPONSORSHIP || '0.50'),
    sponsorLimitPerUser: parseInt(process.env.PAYMASTER_SPONSOR_LIMIT_PER_USER || '3', 10),
  },

  // Blockchain
  blockchain: {
    baseRpcUrl: process.env.BASE_RPC_URL!,
    baseRpcUrlBackup: process.env.BASE_RPC_URL_BACKUP || 'https://mainnet.base.org',
    chainId: parseInt(process.env.BASE_CHAIN_ID || '8453', 10),
    networkName: process.env.BASE_NETWORK_NAME || 'base-mainnet',
    sepoliaRpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    sepoliaChainId: parseInt(process.env.BASE_SEPOLIA_CHAIN_ID || '84532', 10),
  },

  // Account Abstraction (ERC-4337)
  accountFactory: {
    address: process.env.ACCOUNT_FACTORY_ADDRESS!,
  },

  entryPoint: {
    address: process.env.ENTRYPOINT_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },

  bundler: {
    rpcUrl: process.env.BUNDLER_RPC_URL!,
    provider: process.env.BUNDLER_PROVIDER || 'alchemy',
  },

  // Smart Account Settings
  smartAccount: {
    autoDeploy: process.env.AUTO_DEPLOY_ACCOUNTS === 'true',
    counterfactual: process.env.COUNTERFACTUAL_ADDRESSES === 'true',
    minBalanceForDeployment: parseFloat(process.env.MIN_BALANCE_FOR_DEPLOYMENT || '0'),
  },

  // Gas Optimization
  gas: {
    priceStrategy: process.env.GAS_PRICE_STRATEGY || 'medium',
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50', 10),
    refreshInterval: parseInt(process.env.GAS_PRICE_REFRESH_INTERVAL || '30000', 10),
    enableEstimation: process.env.ENABLE_GAS_ESTIMATION === 'true',
    limits: {
      default: parseInt(process.env.DEFAULT_GAS_LIMIT || '200000', 10),
      transfer: parseInt(process.env.TRANSFER_GAS_LIMIT || '100000', 10),
      deploy: parseInt(process.env.SMART_ACCOUNT_DEPLOY_GAS || '500000', 10),
    },
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'Maya <noreply@maya-pay.com>',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },

  // Payment Integrations
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV || 'sandbox',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
  },

  // KYC
  kyc: {
    provider: process.env.KYC_PROVIDER || 'jumio',
    jumio: {
      apiKey: process.env.JUMIO_API_KEY,
      apiSecret: process.env.JUMIO_API_SECRET,
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },

  // Features
  features: {
    escrow: process.env.ENABLE_ESCROW === 'true',
    cards: process.env.ENABLE_CARDS === 'true',
    withdrawals: process.env.ENABLE_WITHDRAWALS === 'true',
    kyc: process.env.ENABLE_KYC === 'true',
  },

  // Limits
  limits: {
    dailyLimit: parseFloat(process.env.DEFAULT_DAILY_LIMIT || '1000'),
    monthlyLimit: parseFloat(process.env.DEFAULT_MONTHLY_LIMIT || '10000'),
    singleTxLimit: parseFloat(process.env.DEFAULT_SINGLE_TX_LIMIT || '5000'),
  },

  // Fees
  fees: {
    baseFeePercentage: parseFloat(process.env.BASE_FEE_PERCENTAGE || '1.0'),
    instantFeeAdditional: parseFloat(process.env.INSTANT_FEE_ADDITIONAL || '1.0'),
    withdrawalFeePercentage: parseFloat(process.env.WITHDRAWAL_FEE_PERCENTAGE || '1.0'),
    minWithdrawalFee: parseFloat(process.env.MIN_WITHDRAWAL_FEE || '5.00'),
  },

  // Email Payments
  emailPayments: {
    expirationDays: parseInt(process.env.DEFAULT_PAYMENT_EXPIRATION_DAYS || '30', 10),
    reminderDays: process.env.CLAIM_REMINDER_DAYS?.split(',').map(Number) || [7, 3, 1],
    trackingEnabled: process.env.EMAIL_TRACKING_ENABLED === 'true',
  },

  // Admin
  admin: {
    twoFactorRequired: process.env.ADMIN_2FA_REQUIRED === 'true',
  },
};

export default config;
