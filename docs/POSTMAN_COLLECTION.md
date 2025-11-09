# Maya API - Postman Collection Documentation

Complete request/response examples organized by screen and feature.

---

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Authentication Screens](#authentication-screens)
3. [Dashboard Screen](#dashboard-screen)
4. [Send USDC Screen](#send-usdc-screen)
5. [Email Payment Screens](#email-payment-screens)
6. [Transaction History Screen](#transaction-history-screen)
7. [Profile/Settings Screen](#profilesettings-screen)
8. [Admin Dashboard](#admin-dashboard)
9. [Admin User Management](#admin-user-management)
10. [Admin Transaction Management](#admin-transaction-management)

---

## Setup & Configuration

### Base URL
```
Development: http://localhost:5000/api
Production: https://api.maya-pay.com/api
```

### Environment Variables

Create Postman environment with these variables:

```json
{
  "base_url": "http://localhost:5000/api",
  "access_token": "",
  "refresh_token": "",
  "admin_token": "",
  "user_id": "",
  "transaction_id": "",
  "claim_token": ""
}
```

### Global Headers

For authenticated requests:
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

---

## Authentication Screens

### 1. Register New User

**Endpoint:** `POST {{base_url}}/auth/register`

**Description:** Create new user account with Web3Auth embedded wallet

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "web3AuthToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEifQ.eyJpc3MiOiJodHRwczovL2F1dGgud2ViM2F1dGguaW8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExNzg2MTkyNzQ4Mjk0MTgzNDcyOSIsImF1ZCI6WyJodHRwczovL2FwaS53ZWIzYXV0aC5pbyIsImh0dHBzOi8vd2ViM2F1dGguaW8iXSwiaWF0IjoxNjQxNzQwMDAwLCJleHAiOjE2NDE3NDM2MDAsImF6cCI6IkJMb2NrY2hhaW4gQXBwIiwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiSm9obiBEb2UifQ.signature",
  "web3AuthPublicKey": "0x04abc123def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
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
      "id": "cm4a8x1y50000vw8q2z9j3k5m",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "phoneNumber": "+1234567890",
      "country": "US",
      "kycStatus": "PENDING",
      "kycTier": "TIER_0",
      "emailVerified": false,
      "phoneVerified": false,
      "isSuspended": false,
      "dailyLimit": "1000",
      "monthlyLimit": "10000",
      "notificationPreferences": {
        "email": true,
        "sms": false,
        "push": true
      },
      "createdAt": "2025-01-09T10:30:00.000Z",
      "updatedAt": "2025-01-09T10:30:00.000Z",
      "lastLoginAt": "2025-01-09T10:30:00.000Z"
    },
    "smartAccount": {
      "id": "cm4a8x1z50001vw8q7m2n4p6r",
      "userId": "cm4a8x1y50000vw8q2z9j3k5m",
      "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "accountType": "WEB3AUTH_EMBEDDED",
      "web3AuthPublicKey": "0x04abc123def456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      "paymasterEnabled": true,
      "paymasterAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "isDeployed": false,
      "network": "base",
      "chainId": 8453,
      "nonce": 0,
      "createdAt": "2025-01-09T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRhOHgxeTUwMDAwdnc4cTJ6OWozazVtIiwiaWF0IjoxNjQxNzQwMDAwLCJleHAiOjE2NDE3NDM2MDB9.signature",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRhOHgxeTUwMDAwdnc4cTJ6OWozazVtIiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE2NDE3NDAwMDAsImV4cCI6MTY0MjM0NDgwMH0.signature",
      "expiresIn": 3600
    }
  }
}
```

**Test Scripts:**
```javascript
// Save tokens to environment
pm.test("Status is 201", () => pm.response.to.have.status(201));
pm.test("Response has tokens", () => pm.expect(pm.response.json().data.tokens).to.exist);

const response = pm.response.json();
pm.environment.set("access_token", response.data.tokens.accessToken);
pm.environment.set("refresh_token", response.data.tokens.refreshToken);
pm.environment.set("user_id", response.data.user.id);
```

---

### 2. Login User

**Endpoint:** `POST {{base_url}}/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "web3AuthToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjEifQ..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm4a8x1y50000vw8q2z9j3k5m",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "kycStatus": "VERIFIED",
      "kycTier": "TIER_2"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

### 3. Refresh Access Token

**Endpoint:** `POST {{base_url}}/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "{{refresh_token}}"
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

**Test Scripts:**
```javascript
pm.test("Status is 200", () => pm.response.to.have.status(200));
const response = pm.response.json();
pm.environment.set("access_token", response.data.accessToken);
```

---

### 4. Logout

**Endpoint:** `POST {{base_url}}/auth/logout`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Dashboard Screen

### 1. Get User Profile

**Endpoint:** `GET {{base_url}}/users/profile`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "email": "john.doe@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "US",
    "kycStatus": "VERIFIED",
    "kycTier": "TIER_2",
    "emailVerified": true,
    "phoneVerified": true,
    "isSuspended": false,
    "dailyLimit": "5000.00",
    "monthlyLimit": "50000.00",
    "notificationPreferences": {
      "email": true,
      "sms": true,
      "push": true
    },
    "createdAt": "2025-01-05T10:00:00.000Z",
    "updatedAt": "2025-01-09T15:30:00.000Z",
    "lastLoginAt": "2025-01-09T15:45:00.000Z"
  }
}
```

---

### 2. Get User Balance

**Endpoint:** `GET {{base_url}}/users/balance`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

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

---

### 3. Get Smart Account Details

**Endpoint:** `GET {{base_url}}/wallets/account`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1z50001vw8q7m2n4p6r",
    "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "accountType": "WEB3AUTH_EMBEDDED",
    "balance": "1250.50",
    "paymasterEnabled": true,
    "paymasterAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "isDeployed": true,
    "network": "base",
    "chainId": 8453,
    "deployedAt": "2025-01-05T10:35:00.000Z",
    "nonce": 5
  }
}
```

---

### 4. Get Recent Transactions

**Endpoint:** `GET {{base_url}}/transactions/history?limit=10`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Query Parameters:**
- `limit=10` - Return last 10 transactions

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "cm4b9y2z60000wx9q3a1k4m6n",
        "txHash": "0xabc123def456789abc123def456789abc123def456789abc123def456789abc12",
        "userOpHash": "0xdef456abc789def456abc789def456abc789def456abc789def456abc789def45",
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
      },
      {
        "id": "cm4b9y2z60001wx9q3b2l5n7o",
        "txHash": "0x123abc456def123abc456def123abc456def123abc456def123abc456def1234",
        "status": "COMPLETED",
        "transactionType": "RECEIVE",
        "amount": "50.00",
        "from": "0x1234567890abcdef1234567890abcdef12345678",
        "to": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "note": "Gift",
        "gasSponsored": true,
        "gasCostUSDC": "0.12",
        "createdAt": "2025-01-08T14:20:00.000Z",
        "completedAt": "2025-01-08T14:20:25.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 48,
      "totalPages": 5
    }
  }
}
```

---

## Send USDC Screen

### 1. Get Wallet Balance (Pre-check)

**Endpoint:** `GET {{base_url}}/wallets/balance`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

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

### 2. Send USDC Transaction

**Endpoint:** `POST {{base_url}}/transactions/send`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientAddress": "0x9876543210fedcba9876543210fedcba98765432",
  "amount": "100.00",
  "note": "Payment for freelance work"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4c0z3a70000xy0q4c3m6o8p",
    "txHash": "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    "userOpHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    "status": "COMPLETED",
    "transactionType": "SEND",
    "amount": "100.00",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x9876543210fedcba9876543210fedcba98765432",
    "senderId": "cm4a8x1y50000vw8q2z9j3k5m",
    "recipientId": "cm4a9y2z50002vw8q3a1k4m6n",
    "note": "Payment for freelance work",
    "gasSponsored": true,
    "gasCostUSDC": "0.15",
    "gasCostETH": "0.000045",
    "createdAt": "2025-01-09T17:00:00.000Z",
    "completedAt": "2025-01-09T17:00:35.000Z"
  }
}
```

**Test Scripts:**
```javascript
pm.test("Transaction successful", () => {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().data.status).to.equal("COMPLETED");
});

const txId = pm.response.json().data.id;
pm.environment.set("transaction_id", txId);
```

**Error Response (400 - Insufficient Balance):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Insufficient balance",
    "details": {
      "balance": "50.00",
      "required": "100.00"
    }
  }
}
```

---

## Email Payment Screens

### 1. Send Payment to Email

**Endpoint:** `POST {{base_url}}/payments/send`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientEmail": "recipient@example.com",
  "amount": "50.00",
  "message": "Happy Birthday! 🎂",
  "expirationDays": 30
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4d1a4b80000yz1q5d4n7p9q",
    "recipientEmail": "recipient@example.com",
    "amount": "50.00",
    "message": "Happy Birthday! 🎂",
    "status": "WAITING_CLAIM",
    "claimToken": "claim_k9m2n5p8q1r4s7t0v3w6x9z2a5b8c1d4",
    "claimUrl": "https://maya-pay.com/claim/claim_k9m2n5p8q1r4s7t0v3w6x9z2a5b8c1d4",
    "expiresAt": "2025-02-08T17:05:00.000Z",
    "createdAt": "2025-01-09T17:05:00.000Z",
    "emailSent": true,
    "emailSentAt": "2025-01-09T17:05:05.000Z"
  }
}
```

**Test Scripts:**
```javascript
pm.test("Email payment created", () => {
  pm.response.to.have.status(200);
  const data = pm.response.json().data;
  pm.expect(data.status).to.equal("WAITING_CLAIM");
  pm.expect(data.claimToken).to.exist;
});

pm.environment.set("claim_token", pm.response.json().data.claimToken);
```

---

### 2. Get Email Payment Details (Public - No Auth)

**Endpoint:** `GET {{base_url}}/payments/claim/{{claim_token}}`

**No authentication required**

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4d1a4b80000yz1q5d4n7p9q",
    "amount": "50.00",
    "message": "Happy Birthday! 🎂",
    "status": "WAITING_CLAIM",
    "sender": {
      "fullName": "John Doe"
    },
    "expiresAt": "2025-02-08T17:05:00.000Z",
    "createdAt": "2025-01-09T17:05:00.000Z",
    "daysUntilExpiration": 30
  }
}
```

---

### 3. Claim Email Payment

**Endpoint:** `POST {{base_url}}/payments/claim`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "claimToken": "claim_k9m2n5p8q1r4s7t0v3w6x9z2a5b8c1d4"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4d1a4b80000yz1q5d4n7p9q",
    "amount": "50.00",
    "status": "CLAIMED",
    "txHash": "0x123abc456def789abc123def456789abc123def456789abc123def456789abc12",
    "claimedAt": "2025-01-09T18:00:00.000Z",
    "claimedBy": "cm4a9y2z50002vw8q3a1k4m6n",
    "sender": {
      "fullName": "John Doe",
      "email": "john.doe@example.com"
    },
    "message": "Happy Birthday! 🎂"
  }
}
```

---

### 4. Get Sent Email Payments

**Endpoint:** `GET {{base_url}}/payments/sent?page=1&limit=20`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "cm4d1a4b80000yz1q5d4n7p9q",
        "recipientEmail": "recipient@example.com",
        "amount": "50.00",
        "message": "Happy Birthday! 🎂",
        "status": "CLAIMED",
        "claimUrl": "https://maya-pay.com/claim/claim_k9m2n5p8q1r4s7t0v3w6x9z2a5b8c1d4",
        "createdAt": "2025-01-09T17:05:00.000Z",
        "claimedAt": "2025-01-09T18:00:00.000Z",
        "expiresAt": "2025-02-08T17:05:00.000Z"
      },
      {
        "id": "cm4d1a4b80001yz1q5e5o8q0r",
        "recipientEmail": "another@example.com",
        "amount": "25.00",
        "message": "Thanks!",
        "status": "WAITING_CLAIM",
        "claimUrl": "https://maya-pay.com/claim/claim_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "createdAt": "2025-01-08T14:30:00.000Z",
        "expiresAt": "2025-02-07T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### 5. Get Received Email Payments

**Endpoint:** `GET {{base_url}}/payments/received?page=1&limit=20`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "cm4d2b5c90000za2q6f6p9r1s",
        "amount": "75.00",
        "message": "Great job on the project!",
        "status": "WAITING_CLAIM",
        "sender": {
          "fullName": "Alice Johnson"
        },
        "claimToken": "claim_p9q2r5s8t1u4v7w0x3y6z9a2b5c8d1e4",
        "expiresAt": "2025-02-08T12:00:00.000Z",
        "createdAt": "2025-01-09T12:00:00.000Z",
        "daysUntilExpiration": 30
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

## Transaction History Screen

### 1. Get Transaction History with Filters

**Endpoint:** `GET {{base_url}}/transactions/history`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Query Parameters:**
```
page=1
limit=20
type=SEND
status=COMPLETED
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "cm4c0z3a70000xy0q4c3m6o8p",
        "txHash": "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
        "userOpHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
        "status": "COMPLETED",
        "transactionType": "SEND",
        "amount": "100.00",
        "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "to": "0x9876543210fedcba9876543210fedcba98765432",
        "sender": {
          "id": "cm4a8x1y50000vw8q2z9j3k5m",
          "email": "john.doe@example.com",
          "fullName": "John Doe"
        },
        "recipient": {
          "id": "cm4a9y2z50002vw8q3a1k4m6n",
          "email": "jane.smith@example.com",
          "fullName": "Jane Smith"
        },
        "note": "Payment for freelance work",
        "gasSponsored": true,
        "gasCostUSDC": "0.15",
        "createdAt": "2025-01-09T17:00:00.000Z",
        "completedAt": "2025-01-09T17:00:35.000Z"
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

---

### 2. Get Transaction by ID

**Endpoint:** `GET {{base_url}}/transactions/{{transaction_id}}`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4c0z3a70000xy0q4c3m6o8p",
    "txHash": "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    "userOpHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    "status": "COMPLETED",
    "transactionType": "SEND",
    "amount": "100.00",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x9876543210fedcba9876543210fedcba98765432",
    "senderId": "cm4a8x1y50000vw8q2z9j3k5m",
    "recipientId": "cm4a9y2z50002vw8q3a1k4m6n",
    "sender": {
      "id": "cm4a8x1y50000vw8q2z9j3k5m",
      "email": "john.doe@example.com",
      "fullName": "John Doe"
    },
    "recipient": {
      "id": "cm4a9y2z50002vw8q3a1k4m6n",
      "email": "jane.smith@example.com",
      "fullName": "Jane Smith"
    },
    "note": "Payment for freelance work",
    "gasSponsored": true,
    "gasCostUSDC": "0.15",
    "gasCostETH": "0.000045",
    "userOperation": {
      "id": "cm4c0z3a70001xy0q4d4n7p9r",
      "userOpHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      "bundleHash": "0xbundle123456789bundle123456789bundle123456789bundle123456789bund",
      "status": "CONFIRMED",
      "nonce": 5,
      "actualGasCost": "0.000045",
      "actualGasUsed": 45000
    },
    "createdAt": "2025-01-09T17:00:00.000Z",
    "updatedAt": "2025-01-09T17:00:35.000Z",
    "completedAt": "2025-01-09T17:00:35.000Z"
  }
}
```

---

### 3. Get Transaction Statistics

**Endpoint:** `GET {{base_url}}/transactions/stats`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

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
    "averageTransactionAmount": "182.50",
    "largestTransaction": "500.00",
    "smallestTransaction": "5.00"
  }
}
```

---

## Profile/Settings Screen

### 1. Update User Profile

**Endpoint:** `PUT {{base_url}}/users/profile`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Michael Doe",
  "phoneNumber": "+1987654321",
  "country": "US",
  "notificationPreferences": {
    "email": true,
    "sms": true,
    "push": false
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "email": "john.doe@example.com",
    "fullName": "John Michael Doe",
    "phoneNumber": "+1987654321",
    "country": "US",
    "notificationPreferences": {
      "email": true,
      "sms": true,
      "push": false
    },
    "updatedAt": "2025-01-09T18:30:00.000Z"
  }
}
```

---

### 2. Get User Limits

**Endpoint:** `GET {{base_url}}/users/limits`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

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
    },
    "kycTier": "TIER_2"
  }
}
```

---

### 3. Deploy Smart Account

**Endpoint:** `POST {{base_url}}/wallets/deploy`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "txHash": "0xdeployment123456789deployment123456789deployment123456789deployme",
    "isDeployed": true,
    "deployedAt": "2025-01-09T18:45:00.000Z",
    "gasCostUSDC": "0.50"
  }
}
```

---

## Admin Dashboard

### 1. Admin Login

**Endpoint:** `POST {{base_url}}/admin/auth/login`

**Request Body:**
```json
{
  "email": "admin@maya-pay.com",
  "password": "SecureAdminPassword123!",
  "totpToken": "123456"
}
```

**Response (200 OK - With 2FA):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "adm_1a2b3c4d5e",
      "email": "admin@maya-pay.com",
      "fullName": "Admin User",
      "role": "ADMIN",
      "permissions": [
        "USER_READ",
        "USER_MANAGE",
        "TRANSACTION_READ",
        "TRANSACTION_MANAGE",
        "ANALYTICS_VIEW"
      ],
      "twoFactorEnabled": true,
      "lastLoginAt": "2025-01-09T19:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiYWRtXzFhMmIzYzRkNWUiLCJyb2xlIjoiQURNSU4iLCJwZXJtaXNzaW9ucyI6WyJVU0VSX1JFQUQiLCJVU0VSX01BTkFHRSIsIlRSQU5TQUNUSU9OX1JFQUQiLCJUUkFOU0FDVElPTl9NQU5BR0UiLCJBTkFMWVRJQ1NfVklFVyJdLCJpYXQiOjE2NDE3NTAwMDAsImV4cCI6MTY0MTc3ODgwMH0.signature"
  }
}
```

**Test Scripts:**
```javascript
pm.test("Admin login successful", () => pm.response.to.have.status(200));
pm.environment.set("admin_token", pm.response.json().data.token);
```

**Response (200 OK - 2FA Required):**
```json
{
  "success": true,
  "data": {
    "requiresTwoFactor": true,
    "adminId": "adm_1a2b3c4d5e"
  }
}
```

---

### 2. Get Dashboard Overview

**Endpoint:** `GET {{base_url}}/admin/dashboard/overview`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 5420,
      "activeToday": 342,
      "newToday": 28,
      "suspended": 12
    },
    "transactions": {
      "total": 48750,
      "today": 456,
      "pendingCount": 12,
      "failedCount": 8
    },
    "volume": {
      "total": "2847563.50",
      "today": "45680.25",
      "thisMonth": "385420.75",
      "lastMonth": "298750.00"
    },
    "emailPayments": {
      "total": 1250,
      "unclaimed": 87,
      "unclaimedValue": "4350.00",
      "claimRate": 93.04
    },
    "gasSponsoreship": {
      "totalSponsored": 45280,
      "totalCostUSDC": "6792.00",
      "averageCostUSDC": "0.15"
    }
  }
}
```

---

### 3. Get Volume Over Time

**Endpoint:** `GET {{base_url}}/admin/dashboard/volume?days=30`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "volume": "42580.50",
      "count": 285
    },
    {
      "date": "2025-01-02",
      "volume": "38920.75",
      "count": 256
    },
    {
      "date": "2025-01-09",
      "volume": "45680.25",
      "count": 312
    }
  ]
}
```

---

### 4. Get User Growth

**Endpoint:** `GET {{base_url}}/admin/dashboard/users/growth?days=30`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "newUsers": 45,
      "totalUsers": 5000
    },
    {
      "date": "2025-01-02",
      "newUsers": 52,
      "totalUsers": 5052
    },
    {
      "date": "2025-01-09",
      "newUsers": 48,
      "totalUsers": 5420
    }
  ]
}
```

---

### 5. Get Top Users by Volume

**Endpoint:** `GET {{base_url}}/admin/dashboard/users/top?limit=10`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "cm4a8x1y50000vw8q2z9j3k5m",
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "totalVolume": "125480.50",
      "transactionCount": 342,
      "kycTier": "TIER_2",
      "kycStatus": "VERIFIED",
      "averageTransactionSize": "367.07"
    }
  ]
}
```

---

## Admin User Management

### 1. Get All Users with Filters

**Endpoint:** `GET {{base_url}}/admin/users`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Query Parameters:**
```
search=john
kycStatus=VERIFIED
page=1
limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "cm4a8x1y50000vw8q2z9j3k5m",
        "email": "john.doe@example.com",
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

---

### 2. Get User by ID

**Endpoint:** `GET {{base_url}}/admin/users/{{user_id}}`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "email": "john.doe@example.com",
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
        "id": "cm4a8x1z50001vw8q7m2n4p6r",
        "accountAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "balance": "1250.50",
        "isDeployed": true,
        "network": "base"
      }
    ],
    "transactionStats": {
      "totalSent": "5250.75",
      "totalReceived": "3500.50",
      "transactionCount": 48,
      "failedCount": 2
    },
    "createdAt": "2025-01-05T10:00:00.000Z",
    "lastLoginAt": "2025-01-09T15:30:00.000Z"
  }
}
```

---

### 3. Suspend User

**Endpoint:** `POST {{base_url}}/admin/users/{{user_id}}/suspend`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Suspicious activity detected - multiple high-value transactions from new account"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "isSuspended": true,
    "suspendedAt": "2025-01-09T19:30:00.000Z",
    "suspendedBy": "adm_1a2b3c4d5e",
    "suspensionReason": "Suspicious activity detected - multiple high-value transactions from new account"
  }
}
```

---

### 4. Update KYC Status

**Endpoint:** `PUT {{base_url}}/admin/users/{{user_id}}/kyc`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "VERIFIED",
  "tier": "TIER_2",
  "notes": "All documents verified successfully. Driver's license and utility bill approved."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "kycStatus": "VERIFIED",
    "kycTier": "TIER_2",
    "kycVerifiedAt": "2025-01-09T19:35:00.000Z",
    "kycVerifiedBy": "adm_1a2b3c4d5e"
  }
}
```

---

### 5. Update User Limits

**Endpoint:** `PUT {{base_url}}/admin/users/{{user_id}}/limits`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

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
    "id": "cm4a8x1y50000vw8q2z9j3k5m",
    "dailyLimit": "10000.00",
    "monthlyLimit": "100000.00",
    "updatedAt": "2025-01-09T19:40:00.000Z"
  }
}
```

---

## Admin Transaction Management

### 1. Get All Transactions

**Endpoint:** `GET {{base_url}}/admin/transactions`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Query Parameters:**
```
search=0xabc
status=COMPLETED
page=1
limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "cm4c0z3a70000xy0q4c3m6o8p",
        "txHash": "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
        "userOpHash": "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
        "status": "COMPLETED",
        "transactionType": "SEND",
        "amount": "100.00",
        "sender": {
          "id": "cm4a8x1y50000vw8q2z9j3k5m",
          "email": "john.doe@example.com",
          "fullName": "John Doe"
        },
        "recipient": {
          "id": "cm4a9y2z50002vw8q3a1k4m6n",
          "email": "jane.smith@example.com",
          "fullName": "Jane Smith"
        },
        "gasSponsored": true,
        "gasCostUSDC": "0.15",
        "createdAt": "2025-01-09T17:00:00.000Z",
        "completedAt": "2025-01-09T17:00:35.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 48750,
      "totalPages": 2438
    }
  }
}
```

---

### 2. Get Failed Transactions

**Endpoint:** `GET {{base_url}}/admin/transactions/failed?limit=50`

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cm4e3c6d00000ab3q7g7q0s2t",
      "status": "FAILED",
      "transactionType": "SEND",
      "amount": "50.00",
      "sender": {
        "email": "user@example.com",
        "fullName": "User Name"
      },
      "errorMessage": "Insufficient balance",
      "createdAt": "2025-01-09T14:30:00.000Z",
      "failedAt": "2025-01-09T14:30:15.000Z"
    }
  ]
}
```

---

### 3. Flag Transaction

**Endpoint:** `POST {{base_url}}/admin/transactions/{{transaction_id}}/flag`

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Unusually large amount for this user's transaction history",
  "severity": "HIGH"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cm4c0z3a70000xy0q4c3m6o8p",
    "flagged": true,
    "flagReason": "Unusually large amount for this user's transaction history",
    "flagSeverity": "HIGH",
    "flaggedAt": "2025-01-09T20:00:00.000Z",
    "flaggedBy": "adm_1a2b3c4d5e"
  }
}
```

---

## Notes

- Replace `{{variable}}` with actual values or set Postman environment variables
- All authenticated endpoints require valid JWT tokens
- Admin endpoints require admin-specific JWT tokens with appropriate permissions
- Use the Test Scripts provided to automatically save tokens and IDs to environment variables
- Error responses follow the standard format documented in the API documentation

---

**Last Updated:** January 9, 2025
