# Maya Backend API Documentation

**Version:** 1.0.0
**Base URL:** `https://api.maya-pay.com` (Production) | `http://localhost:5000` (Development)
**API Prefix:** `/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Network Support](#network-support)
4. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [User Management](#user-management-endpoints)
   - [Wallet Operations](#wallet-operations-endpoints)
   - [Transactions](#transaction-endpoints)
   - [Email Payments](#email-payment-endpoints)
   - [Admin System](#admin-endpoints)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

Maya Backend API is a RESTful API for cross-border USDC payments with the following features:

- **Web3Auth Integration**: Passwordless authentication with social login
- **ERC-4337 Account Abstraction**: Smart contract wallets with gasless transactions
- **Circle Paymaster**: Users pay gas in USDC instead of ETH
- **Email-as-Payment-Address**: Send USDC to anyone using just their email
- **Multi-Network Support**: Mainnet and Testnet compatibility
- **Comprehensive Admin System**: Full-featured admin dashboard with analytics

### Technology Stack

- **Blockchain**: Base (Ethereum L2)
- **Smart Accounts**: ERC-4337 Account Abstraction
- **Stablecoin**: USDC (Circle)
- **Authentication**: Web3Auth + JWT
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queue**: Bull (Redis-based)

---

## Authentication

Maya uses a dual authentication system:

### User Authentication (Web3Auth + JWT)

1. **Web3Auth Social Login** - Users authenticate via Google, Twitter, etc.
2. **JWT Tokens** - Session management with access and refresh tokens
3. **Smart Account Creation** - Automatic embedded wallet creation on signup

**Headers Required:**
```http
Authorization: Bearer <access_token>
```

### Admin Authentication (JWT with 2FA)

1. **Email/Password Login** - Admin credentials
2. **Two-Factor Authentication (2FA)** - TOTP-based (optional/required)
3. **Admin JWT Tokens** - Separate token system with role-based permissions

**Headers Required:**
```http
Authorization: Bearer <admin_token>
```

---

## Network Support

The API supports both mainnet and testnet:

- **Mainnet**: Base Mainnet (Chain ID: 8453)
- **Testnet**: Base Sepolia (Chain ID: 84532)

Network is automatically selected based on environment:
- Production environment → Mainnet
- Development environment → Testnet

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User (Web3Auth)

**POST** `/api/auth/register`

Create a new user account with Web3Auth embedded wallet.

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "web3AuthToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "web3AuthPublicKey": "0x04abc123...",
  "phoneNumber": "+1234567890",
  "country": "US"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123abc",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "country": "US",
      "kycStatus": "PENDING",
      "kycTier": "TIER_0",
      "emailVerified": false,
      "createdAt": "2025-01-09T10:30:00.000Z"
    },
    "smartAccount": {
      "id": "acc_456def",
      "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "accountType": "WEB3AUTH_EMBEDDED",
      "paymasterEnabled": true,
      "isDeployed": false,
      "network": "base",
      "chainId": 8453
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### 2. Login User

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "web3AuthToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123abc",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### 3. Refresh Token

**POST** `/api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### 4. Logout

**POST** `/api/auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### User Management Endpoints

#### 1. Get User Profile

**GET** `/api/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "US",
    "kycStatus": "VERIFIED",
    "kycTier": "TIER_2",
    "emailVerified": true,
    "phoneVerified": true,
    "isSuspended": false,
    "notificationPreferences": {
      "email": true,
      "sms": false,
      "push": true
    },
    "createdAt": "2025-01-09T10:30:00.000Z",
    "lastLoginAt": "2025-01-09T15:45:00.000Z"
  }
}
```

#### 2. Update User Profile

**PUT** `/api/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "fullName": "John Smith",
  "phoneNumber": "+1234567890",
  "country": "US",
  "notificationPreferences": {
    "email": true,
    "sms": true,
    "push": true
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "fullName": "John Smith",
    "phoneNumber": "+1234567890",
    "updatedAt": "2025-01-09T16:00:00.000Z"
  }
}
```

#### 3. Get User Balance

**GET** `/api/users/balance`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "balance": "1250.50",
    "currency": "USDC",
    "network": "base",
    "smartAccountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "lastUpdated": "2025-01-09T16:05:00.000Z"
  }
}
```

#### 4. Get User Limits

**GET** `/api/users/limits`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "dailyLimit": "5000.00",
    "dailyUsed": "1250.50",
    "dailyRemaining": "3749.50",
    "monthlyLimit": "50000.00",
    "monthlyUsed": "8750.00",
    "monthlyRemaining": "41250.00",
    "singleTransactionLimit": "10000.00",
    "resetDate": {
      "daily": "2025-01-10T00:00:00.000Z",
      "monthly": "2025-02-01T00:00:00.000Z"
    }
  }
}
```

---

### Wallet Operations Endpoints

#### 1. Get Smart Account Details

**GET** `/api/wallets/account`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "acc_456def",
    "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "accountType": "WEB3AUTH_EMBEDDED",
    "balance": "1250.50",
    "paymasterEnabled": true,
    "paymasterAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "isDeployed": true,
    "network": "base",
    "chainId": 8453,
    "deployedAt": "2025-01-09T10:35:00.000Z",
    "nonce": 5
  }
}
```

#### 2. Deploy Smart Account

**POST** `/api/wallets/deploy`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "txHash": "0xabc123def456...",
    "isDeployed": true,
    "deployedAt": "2025-01-09T16:10:00.000Z"
  }
}
```

#### 3. Get Wallet Balance

**GET** `/api/wallets/balance`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "usdc": "1250.50",
    "eth": "0.0",
    "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "network": "base"
  }
}
```

---

### Transaction Endpoints

#### 1. Send USDC

**POST** `/api/transactions/send`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientAddress": "0x9876543210fedcba9876543210fedcba98765432",
  "amount": "100.00",
  "note": "Payment for services"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_789ghi",
    "txHash": "0xdef456abc789...",
    "userOpHash": "0x123abc456def...",
    "status": "COMPLETED",
    "transactionType": "SEND",
    "amount": "100.00",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x9876543210fedcba9876543210fedcba98765432",
    "note": "Payment for services",
    "gasSponsored": true,
    "gasCostUSDC": "0.15",
    "createdAt": "2025-01-09T16:15:00.000Z",
    "completedAt": "2025-01-09T16:15:30.000Z"
  }
}
```

#### 2. Get Transaction History

**GET** `/api/transactions/history?page=1&limit=20&type=SEND&status=COMPLETED`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): SEND, RECEIVE, EMAIL_PAYMENT
- `status` (optional): PENDING, COMPLETED, FAILED

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_789ghi",
        "txHash": "0xdef456abc789...",
        "status": "COMPLETED",
        "transactionType": "SEND",
        "amount": "100.00",
        "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "to": "0x9876543210fedcba9876543210fedcba98765432",
        "note": "Payment for services",
        "createdAt": "2025-01-09T16:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### 3. Get Transaction by ID

**GET** `/api/transactions/:transactionId`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_789ghi",
    "txHash": "0xdef456abc789...",
    "userOpHash": "0x123abc456def...",
    "status": "COMPLETED",
    "transactionType": "SEND",
    "amount": "100.00",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x9876543210fedcba9876543210fedcba98765432",
    "sender": {
      "id": "usr_123abc",
      "email": "user@example.com",
      "fullName": "John Doe"
    },
    "recipient": {
      "id": "usr_456def",
      "email": "recipient@example.com",
      "fullName": "Jane Smith"
    },
    "note": "Payment for services",
    "gasSponsored": true,
    "gasCostUSDC": "0.15",
    "userOperation": {
      "userOpHash": "0x123abc456def...",
      "bundleHash": "0xbundle123...",
      "status": "CONFIRMED",
      "nonce": 5
    },
    "createdAt": "2025-01-09T16:15:00.000Z",
    "completedAt": "2025-01-09T16:15:30.000Z"
  }
}
```

#### 4. Get Transaction Statistics

**GET** `/api/transactions/stats`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalSent": "5250.75",
    "totalReceived": "3500.50",
    "totalTransactions": 48,
    "thisMonth": {
      "sent": "1250.50",
      "received": "850.00",
      "transactions": 12
    },
    "averageTransactionAmount": "182.50"
  }
}
```

---

### Email Payment Endpoints

#### 1. Send Payment to Email

**POST** `/api/payments/send`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientEmail": "recipient@example.com",
  "amount": "50.00",
  "message": "Gift for your birthday!",
  "expirationDays": 30
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "emp_abc123",
    "recipientEmail": "recipient@example.com",
    "amount": "50.00",
    "message": "Gift for your birthday!",
    "status": "WAITING_CLAIM",
    "claimToken": "claim_xyz789",
    "claimUrl": "https://maya-pay.com/claim/claim_xyz789",
    "expiresAt": "2025-02-08T16:20:00.000Z",
    "createdAt": "2025-01-09T16:20:00.000Z"
  }
}
```

#### 2. Claim Email Payment

**POST** `/api/payments/claim`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "claimToken": "claim_xyz789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "emp_abc123",
    "amount": "50.00",
    "status": "CLAIMED",
    "txHash": "0xabc123def456...",
    "claimedAt": "2025-01-09T17:00:00.000Z",
    "sender": {
      "fullName": "John Doe",
      "email": "sender@example.com"
    }
  }
}
```

#### 3. Get Email Payment by Token

**GET** `/api/payments/claim/:claimToken`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "emp_abc123",
    "amount": "50.00",
    "message": "Gift for your birthday!",
    "status": "WAITING_CLAIM",
    "sender": {
      "fullName": "John Doe"
    },
    "expiresAt": "2025-02-08T16:20:00.000Z",
    "createdAt": "2025-01-09T16:20:00.000Z"
  }
}
```

#### 4. Get Sent Email Payments

**GET** `/api/payments/sent?page=1&limit=20`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "emp_abc123",
        "recipientEmail": "recipient@example.com",
        "amount": "50.00",
        "status": "CLAIMED",
        "createdAt": "2025-01-09T16:20:00.000Z",
        "claimedAt": "2025-01-09T17:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### 5. Get Received Email Payments

**GET** `/api/payments/received?page=1&limit=20`

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "emp_def456",
        "amount": "75.00",
        "message": "Thank you!",
        "status": "WAITING_CLAIM",
        "sender": {
          "fullName": "Alice Johnson"
        },
        "claimToken": "claim_abc999",
        "expiresAt": "2025-02-08T16:20:00.000Z",
        "createdAt": "2025-01-08T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

### Admin Endpoints

All admin endpoints require admin authentication and appropriate permissions.

#### Admin Authentication

##### 1. Admin Login

**POST** `/api/admin/auth/login`

**Request Body:**
```json
{
  "email": "admin@maya-pay.com",
  "password": "SecurePassword123!",
  "totpToken": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "adm_123",
      "email": "admin@maya-pay.com",
      "fullName": "Admin User",
      "role": "ADMIN",
      "permissions": ["USER_READ", "USER_MANAGE", "TRANSACTION_READ"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (200 OK - 2FA Required):**
```json
{
  "success": true,
  "data": {
    "requiresTwoFactor": true,
    "adminId": "adm_123"
  }
}
```

##### 2. Setup 2FA

**POST** `/api/admin/auth/2fa/setup`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "secret": "JBSWY3DPEHPK3PXP",
    "manualEntryKey": "JBSW Y3DP EHPK 3PXP"
  }
}
```

##### 3. Verify 2FA

**POST** `/api/admin/auth/2fa/verify`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "twoFactorEnabled": true,
    "message": "2FA enabled successfully"
  }
}
```

##### 4. Get Admin Profile

**GET** `/api/admin/auth/me`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "adm_123",
    "email": "admin@maya-pay.com",
    "fullName": "Admin User",
    "role": "ADMIN",
    "permissions": ["USER_READ", "USER_MANAGE", "TRANSACTION_READ"],
    "twoFactorEnabled": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "lastLoginAt": "2025-01-09T16:30:00.000Z"
  }
}
```

#### Admin Dashboard

##### 1. Dashboard Overview

**GET** `/api/admin/dashboard/overview`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5420,
      "activeToday": 342,
      "newToday": 28
    },
    "transactions": {
      "total": 48750,
      "today": 456,
      "pendingCount": 12
    },
    "volume": {
      "total": "2847563.50",
      "today": "45680.25",
      "thisMonth": "385420.75"
    },
    "emailPayments": {
      "total": 1250,
      "unclaimed": 87,
      "unclaimedValue": "4350.00"
    }
  }
}
```

##### 2. Transaction Statistics

**GET** `/api/admin/dashboard/transactions/stats?startDate=2025-01-01&endDate=2025-01-09`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 2540,
    "totalVolume": "385420.75",
    "byType": [
      { "type": "SEND", "count": 1890, "volume": "285630.50" },
      { "type": "RECEIVE", "count": 450, "volume": "67890.25" },
      { "type": "EMAIL_PAYMENT", "count": 200, "volume": "31900.00" }
    ],
    "byStatus": [
      { "status": "COMPLETED", "count": 2480, "percentage": 97.64 },
      { "status": "PENDING", "count": 45, "percentage": 1.77 },
      { "status": "FAILED", "count": 15, "percentage": 0.59 }
    ],
    "averageAmount": "151.74",
    "successRate": 97.64
  }
}
```

##### 3. User Growth Statistics

**GET** `/api/admin/dashboard/users/growth?days=30`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "date": "2025-01-01", "newUsers": 45, "totalUsers": 5000 },
    { "date": "2025-01-02", "newUsers": 52, "totalUsers": 5052 },
    { "date": "2025-01-09", "newUsers": 48, "totalUsers": 5420 }
  ]
}
```

##### 4. Volume Over Time

**GET** `/api/admin/dashboard/volume?days=30`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "date": "2025-01-01", "volume": "42580.50", "count": 285 },
    { "date": "2025-01-02", "volume": "38920.75", "count": 256 },
    { "date": "2025-01-09", "volume": "45680.25", "count": 312 }
  ]
}
```

##### 5. Email Payment Statistics

**GET** `/api/admin/dashboard/email-payments/stats?startDate=2025-01-01&endDate=2025-01-09`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalSent": 145,
    "totalClaimed": 98,
    "totalExpired": 12,
    "totalWaiting": 35,
    "claimRate": 67.59,
    "totalValue": "7250.00",
    "claimedValue": "4900.00",
    "waitingValue": "1750.00",
    "expiredValue": "600.00",
    "averageClaimTime": 2.5
  }
}
```

##### 6. Top Users by Volume

**GET** `/api/admin/dashboard/users/top?limit=10`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "usr_123",
      "email": "john@example.com",
      "fullName": "John Doe",
      "totalVolume": "125480.50",
      "transactionCount": 342,
      "kycTier": "TIER_2"
    }
  ]
}
```

##### 7. Paymaster Metrics

**GET** `/api/admin/dashboard/paymaster/metrics?startDate=2025-01-01&endDate=2025-01-09`

**Headers:** `Authorization: Bearer <admin_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalSponsored": 2145,
    "totalGasCostUSDC": "321.75",
    "totalGasCostETH": "0.0856",
    "averageGasCost": "0.15",
    "sponsorshipRate": 84.5,
    "byStatus": [
      { "status": "SPONSORED", "count": 2145 },
      { "status": "USER_PAID", "count": 395 }
    ]
  }
}
```

#### Admin User Management

##### 1. Get All Users

**GET** `/api/admin/users?search=john&kycStatus=VERIFIED&page=1&limit=20`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_READ` or `USER_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_123",
        "email": "john@example.com",
        "fullName": "John Doe",
        "kycStatus": "VERIFIED",
        "kycTier": "TIER_2",
        "isSuspended": false,
        "emailVerified": true,
        "createdAt": "2025-01-05T10:00:00.000Z",
        "lastLoginAt": "2025-01-09T15:30:00.000Z",
        "_count": {
          "transactions": 48,
          "smartAccounts": 1
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 245,
      "totalPages": 13
    }
  }
}
```

##### 2. Get User by ID

**GET** `/api/admin/users/:userId`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_READ` or `USER_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "US",
    "kycStatus": "VERIFIED",
    "kycTier": "TIER_2",
    "isSuspended": false,
    "emailVerified": true,
    "phoneVerified": true,
    "dailyLimit": "5000.00",
    "monthlyLimit": "50000.00",
    "smartAccounts": [
      {
        "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "balance": "1250.50",
        "isDeployed": true
      }
    ],
    "transactionStats": {
      "totalSent": "5250.75",
      "totalReceived": "3500.50",
      "transactionCount": 48
    },
    "createdAt": "2025-01-05T10:00:00.000Z",
    "lastLoginAt": "2025-01-09T15:30:00.000Z"
  }
}
```

##### 3. Suspend User

**POST** `/api/admin/users/:userId/suspend`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_MANAGE`

**Request Body:**
```json
{
  "reason": "Suspicious activity detected"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "isSuspended": true,
    "suspendedAt": "2025-01-09T17:00:00.000Z",
    "suspensionReason": "Suspicious activity detected"
  }
}
```

##### 4. Unsuspend User

**POST** `/api/admin/users/:userId/unsuspend`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "isSuspended": false,
    "suspendedAt": null,
    "suspensionReason": null
  }
}
```

##### 5. Flag User

**POST** `/api/admin/users/:userId/flag`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_MANAGE`

**Request Body:**
```json
{
  "reason": "Multiple high-value transactions",
  "severity": "MEDIUM"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "flagged": true,
    "flagReason": "Multiple high-value transactions",
    "flagSeverity": "MEDIUM"
  }
}
```

##### 6. Update KYC Status

**PUT** `/api/admin/users/:userId/kyc`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `KYC_MANAGE`

**Request Body:**
```json
{
  "status": "VERIFIED",
  "tier": "TIER_2",
  "notes": "All documents verified successfully"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "kycStatus": "VERIFIED",
    "kycTier": "TIER_2",
    "kycVerifiedAt": "2025-01-09T17:15:00.000Z"
  }
}
```

##### 7. Update User Limits

**PUT** `/api/admin/users/:userId/limits`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `USER_MANAGE`

**Request Body:**
```json
{
  "dailyLimit": "10000.00",
  "monthlyLimit": "100000.00"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "dailyLimit": "10000.00",
    "monthlyLimit": "100000.00",
    "updatedAt": "2025-01-09T17:20:00.000Z"
  }
}
```

##### 8. Add Admin Note

**POST** `/api/admin/users/:userId/notes`

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "note": "User requested limit increase due to business expansion"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "note_123",
    "userId": "usr_123",
    "adminId": "adm_123",
    "note": "User requested limit increase due to business expansion",
    "createdAt": "2025-01-09T17:25:00.000Z"
  }
}
```

#### Admin Transaction Management

##### 1. Get All Transactions

**GET** `/api/admin/transactions?search=0xabc&status=COMPLETED&page=1&limit=20`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_READ` or `TRANSACTION_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_789",
        "txHash": "0xabc123...",
        "status": "COMPLETED",
        "transactionType": "SEND",
        "amount": "100.00",
        "sender": {
          "email": "john@example.com",
          "fullName": "John Doe"
        },
        "recipient": {
          "email": "jane@example.com",
          "fullName": "Jane Smith"
        },
        "createdAt": "2025-01-09T16:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 450,
      "totalPages": 23
    }
  }
}
```

##### 2. Get Failed Transactions

**GET** `/api/admin/transactions/failed?limit=50`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_READ` or `TRANSACTION_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_890",
      "status": "FAILED",
      "amount": "50.00",
      "sender": {
        "email": "user@example.com"
      },
      "errorMessage": "Insufficient balance",
      "createdAt": "2025-01-09T14:30:00.000Z"
    }
  ]
}
```

##### 3. Update Transaction Status

**PUT** `/api/admin/transactions/:transactionId/status`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_MANAGE`

**Request Body:**
```json
{
  "status": "FAILED",
  "notes": "Manually marked as failed due to timeout"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_789",
    "status": "FAILED",
    "updatedAt": "2025-01-09T17:30:00.000Z"
  }
}
```

##### 4. Flag Transaction

**POST** `/api/admin/transactions/:transactionId/flag`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_MANAGE`

**Request Body:**
```json
{
  "reason": "Unusually large amount for this user",
  "severity": "HIGH"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_789",
    "flagged": true,
    "flagReason": "Unusually large amount for this user",
    "flagSeverity": "HIGH"
  }
}
```

##### 5. Retry Failed Transaction

**POST** `/api/admin/transactions/:transactionId/retry`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "txn_789",
    "status": "PENDING",
    "retryAttempt": 1,
    "updatedAt": "2025-01-09T17:35:00.000Z"
  }
}
```

##### 6. Export Transactions

**GET** `/api/admin/transactions/export?startDate=2025-01-01&endDate=2025-01-09&status=COMPLETED`

**Headers:** `Authorization: Bearer <admin_token>`

**Permissions Required:** `TRANSACTION_READ` or `TRANSACTION_MANAGE`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_789",
      "createdAt": "2025-01-09T16:00:00.000Z",
      "status": "COMPLETED",
      "type": "SEND",
      "amount": "100.00",
      "senderEmail": "john@example.com",
      "senderName": "John Doe",
      "recipientEmail": "jane@example.com",
      "recipientName": "Jane Smith",
      "txHash": "0xabc123...",
      "userOpHash": "0xdef456..."
    }
  ]
}
```

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHORIZED` | Authentication required or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate email) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |

### Example Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "amount": "Amount must be greater than 0",
      "recipientAddress": "Invalid Ethereum address"
    }
  }
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Requires one of the following permissions: USER_MANAGE"
  }
}
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 15 minutes.",
    "details": {
      "retryAfter": 900
    }
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per 15 minutes per IP address
- **Admin Endpoints**: 50 requests per 15 minutes
- **Auth Endpoints**: 10 requests per 15 minutes

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641740400
```

---

## Admin Roles and Permissions

### Roles

- **SUPER_ADMIN**: Full access to all features
- **ADMIN**: Access to most features except creating other admins
- **MODERATOR**: Limited access (view-only for most features)

### Permissions

- `USER_READ`: View user information
- `USER_MANAGE`: Suspend, flag, update users
- `TRANSACTION_READ`: View transactions
- `TRANSACTION_MANAGE`: Update, flag, retry transactions
- `KYC_MANAGE`: Update KYC status and tiers
- `ANALYTICS_VIEW`: View dashboard and analytics
- `SETTINGS_MANAGE`: Manage system settings

---

## Networks Configuration

### Mainnet (Production)

```
Network: Base Mainnet
Chain ID: 8453
RPC URL: https://mainnet.base.org
USDC Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Explorer: https://basescan.org
```

### Testnet (Development)

```
Network: Base Sepolia
Chain ID: 84532
RPC URL: https://sepolia.base.org
USDC Contract: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Explorer: https://sepolia.basescan.org
```

---

## Support

For API support and questions:
- Email: dev@maya-pay.com
- Documentation: https://docs.maya-pay.com
- Status Page: https://status.maya-pay.com

---

**Last Updated:** January 9, 2025
**API Version:** 1.0.0
