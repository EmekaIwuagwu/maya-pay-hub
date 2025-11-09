# Maya Pay Hub - Complete Frontend Integration Guide for Loveable.dev

## 📋 Table of Contents
1. [Overview](#overview)
2. [Backend URLs & Setup](#backend-urls--setup)
3. [Authentication](#authentication)
4. [Unified Send Feature](#unified-send-feature)
5. [Phone Payment Feature](#phone-payment-feature)
6. [Email Payment Feature](#email-payment-feature)
7. [Wallet Payment Feature](#wallet-payment-feature)
8. [Complete Frontend Implementation Examples](#complete-frontend-implementation-examples)
9. [Error Handling](#error-handling)
10. [Testing Guide](#testing-guide)

---

## Overview

Maya Pay Hub backend now supports **THREE** payment methods:
- 💳 **Wallet Address** - Direct blockchain transfer
- 📧 **Email** - Escrow with email notification and claim flow
- 📱 **Phone Number** - Escrow with SMS notification and claim flow

Additionally, there's a **Unified Send** endpoint that automatically detects the recipient type and routes the payment accordingly.

---

## Backend URLs & Setup

### Base URLs

**Local Development:**
```
http://localhost:3000/api
```

**Production (Deployed on Cloud):**
```
https://your-production-domain.com/api
```
*Replace `your-production-domain.com` with your actual deployed backend URL*

### Environment Configuration

Create a `.env` file in your frontend project:

```bash
# For Local Development
VITE_API_BASE_URL=http://localhost:3000/api
# OR for Production
VITE_API_BASE_URL=https://your-production-domain.com/api

# Frontend URL (for claim links)
VITE_APP_URL=http://localhost:5173
# OR for Production
VITE_APP_URL=https://your-frontend-domain.com
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header.

### Headers Required

```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}` // JWT token from login/registration
};
```

### Getting the Access Token

After user login or registration, you receive:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

Store the `accessToken` in your state management (Redux, Zustand, Context API, etc.).

---

## Unified Send Feature

### 🎯 Overview

The unified send endpoint is the **RECOMMENDED** way to send payments. It automatically detects whether the recipient is a wallet address, email, or phone number.

### Endpoint: Preview Send (Check Recipient Type)

**Purpose:** Check what type of recipient the user has entered before sending.

**Method:** `GET`
**Path:** `/transactions/preview`
**Authentication:** ❌ Not required (can be used before login)

#### Request

**URL with Query Parameter:**
```
GET http://localhost:3000/api/transactions/preview?recipient=user@example.com
```

**TypeScript Example:**
```typescript
const previewRecipient = async (recipient: string) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const url = `${baseURL}/transactions/preview?recipient=${encodeURIComponent(recipient)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return data;
};

// Usage
const preview = await previewRecipient('user@example.com');
console.log(preview);
```

#### Response Examples

**For Email:**
```json
{
  "success": true,
  "data": {
    "type": "EMAIL",
    "valid": true,
    "formattedRecipient": "user@example.com",
    "message": "This is a valid email address. Payment will be sent via email with a claim link."
  }
}
```

**For Phone Number:**
```json
{
  "success": true,
  "data": {
    "type": "PHONE",
    "valid": true,
    "formattedRecipient": "+1234567890",
    "message": "This is a valid phone number. Payment will be sent via SMS with a claim link."
  }
}
```

**For Wallet Address:**
```json
{
  "success": true,
  "data": {
    "type": "WALLET",
    "valid": true,
    "formattedRecipient": "0x1234567890123456789012345678901234567890",
    "message": "This is a valid wallet address. Payment will be sent directly to this address."
  }
}
```

**For Invalid Recipient:**
```json
{
  "success": true,
  "data": {
    "type": "UNKNOWN",
    "valid": false,
    "message": "Invalid recipient. Please provide a valid wallet address (0x...), email, or phone number."
  }
}
```

### Endpoint: Send Payment (Unified)

**Purpose:** Send USDC to a wallet, email, or phone number automatically.

**Method:** `POST`
**Path:** `/transactions/send-unified`
**Authentication:** ✅ Required

#### Request

**Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

**Request Body:**
```typescript
{
  "recipient": string,           // Email, phone, or wallet address
  "amount": string,              // Amount in USDC (e.g., "10.50")
  "personalMessage"?: string,    // Optional message (for email/phone only)
  "referenceNote"?: string,      // Optional internal reference
  "expirationDays"?: number      // Optional, defaults to 7 (for email/phone only)
}
```

**TypeScript Example:**
```typescript
interface UnifiedSendRequest {
  recipient: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}

const sendPayment = async (paymentData: UnifiedSendRequest) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken'); // or from your state management

  const response = await fetch(`${baseURL}/transactions/send-unified`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send payment');
  }

  const data = await response.json();
  return data;
};

// Usage Examples:

// 1. Send to Email
const emailPayment = await sendPayment({
  recipient: 'user@example.com',
  amount: '50.00',
  personalMessage: 'Thanks for lunch!',
  expirationDays: 7
});

// 2. Send to Phone Number
const phonePayment = await sendPayment({
  recipient: '+1234567890',
  amount: '25.50',
  personalMessage: 'Happy birthday!',
  expirationDays: 14
});

// 3. Send to Wallet
const walletPayment = await sendPayment({
  recipient: '0x1234567890123456789012345678901234567890',
  amount: '100.00',
  referenceNote: 'Payment for services'
});
```

#### Response Examples

**For Email Payment:**
```json
{
  "success": true,
  "message": "Payment sent via email successfully",
  "recipientType": "EMAIL",
  "data": {
    "emailPayment": {
      "id": "email_payment_id_123",
      "senderId": "user_id_456",
      "senderEmail": "sender@example.com",
      "recipientEmail": "user@example.com",
      "amount": "50.00",
      "currency": "USDC",
      "status": "PENDING",
      "personalMessage": "Thanks for lunch!",
      "emailTrackingId": "track_abc123",
      "expiresAt": "2025-11-16T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z"
    },
    "transaction": {
      "id": "tx_789",
      "type": "EMAIL_PAYMENT",
      "amount": "50.00",
      "status": "PENDING"
    },
    "claimUrl": "http://localhost:5173/claim/email/track_abc123"
  }
}
```

**For Phone Payment:**
```json
{
  "success": true,
  "message": "Payment sent via SMS successfully",
  "recipientType": "PHONE",
  "data": {
    "phonePayment": {
      "id": "phone_payment_id_123",
      "senderId": "user_id_456",
      "senderPhone": "+1234567890",
      "recipientPhone": "+1987654321",
      "amount": "25.50",
      "currency": "USDC",
      "status": "PENDING",
      "personalMessage": "Happy birthday!",
      "smsTrackingId": "track_xyz789",
      "smsSentAt": "2025-11-09T10:00:00.000Z",
      "expiresAt": "2025-11-23T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z"
    },
    "transaction": {
      "id": "tx_790",
      "type": "PHONE_PAYMENT",
      "amount": "25.50",
      "status": "PENDING"
    },
    "claimUrl": "http://localhost:5173/claim/phone/track_xyz789"
  }
}
```

**For Wallet Payment:**
```json
{
  "success": true,
  "message": "Payment sent to wallet successfully",
  "recipientType": "WALLET",
  "data": {
    "transaction": {
      "id": "tx_791",
      "type": "SEND",
      "senderId": "user_id_456",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "amount": "100.00",
      "currency": "USDC",
      "status": "COMPLETED",
      "txHash": "0xabcdef123456...",
      "network": "BASE_MAINNET",
      "createdAt": "2025-11-09T10:00:00.000Z"
    }
  }
}
```

---

## Phone Payment Feature

### Endpoint: Send to Phone Number

**Purpose:** Send USDC to a phone number with SMS notification.

**Method:** `POST`
**Path:** `/payments/phone`
**Authentication:** ✅ Required

#### Request

**Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

**Request Body:**
```typescript
{
  "recipientPhone": string,      // Phone number (formats: +1234567890, 1234567890, etc.)
  "amount": string,              // Amount in USDC
  "personalMessage"?: string,    // Optional message for recipient
  "referenceNote"?: string,      // Optional internal note
  "expirationDays"?: number      // Optional, defaults to 7
}
```

**TypeScript Example:**
```typescript
interface PhonePaymentRequest {
  recipientPhone: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}

const sendToPhone = async (paymentData: PhonePaymentRequest) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/phone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send phone payment');
  }

  return await response.json();
};

// Usage
const payment = await sendToPhone({
  recipientPhone: '+1234567890',
  amount: '75.00',
  personalMessage: 'Payment for concert tickets',
  expirationDays: 10
});
```

#### Response

```json
{
  "success": true,
  "message": "Payment sent via SMS",
  "data": {
    "phonePayment": {
      "id": "phone_pay_123",
      "senderId": "user_456",
      "senderPhone": "+1111111111",
      "recipientPhone": "+1234567890",
      "amount": "75.00",
      "currency": "USDC",
      "status": "PENDING",
      "personalMessage": "Payment for concert tickets",
      "smsTrackingId": "track_phone_abc",
      "smsSentAt": "2025-11-09T10:00:00.000Z",
      "expiresAt": "2025-11-19T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z"
    },
    "transaction": {
      "id": "tx_999",
      "type": "PHONE_PAYMENT",
      "amount": "75.00",
      "status": "PENDING"
    },
    "claimUrl": "http://localhost:5173/claim/phone/track_phone_abc"
  }
}
```

### Endpoint: Get Sent Phone Payments

**Purpose:** Get all phone payments sent by the authenticated user.

**Method:** `GET`
**Path:** `/payments/phone/sent`
**Authentication:** ✅ Required

#### Request

**TypeScript Example:**
```typescript
const getSentPhonePayments = async () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/phone/sent`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return await response.json();
};
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "phone_pay_123",
      "senderId": "user_456",
      "recipientPhone": "+1234567890",
      "amount": "75.00",
      "status": "PENDING",
      "personalMessage": "Payment for concert tickets",
      "expiresAt": "2025-11-19T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z",
      "transaction": {
        "id": "tx_999",
        "type": "PHONE_PAYMENT"
      }
    },
    {
      "id": "phone_pay_124",
      "senderId": "user_456",
      "recipientPhone": "+1987654321",
      "amount": "50.00",
      "status": "CLAIMED",
      "claimedAt": "2025-11-10T15:00:00.000Z",
      "createdAt": "2025-11-08T10:00:00.000Z"
    }
  ]
}
```

### Endpoint: Get Received Phone Payments

**Purpose:** Get all phone payments received by the authenticated user.

**Method:** `GET`
**Path:** `/payments/phone/received`
**Authentication:** ✅ Required

#### Request

**TypeScript Example:**
```typescript
const getReceivedPhonePayments = async () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/phone/received`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return await response.json();
};
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "phone_pay_789",
      "senderId": "user_111",
      "recipientPhone": "+1234567890",
      "recipientId": "user_456",
      "amount": "100.00",
      "status": "PENDING",
      "personalMessage": "Birthday gift!",
      "expiresAt": "2025-11-16T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z",
      "sender": {
        "id": "user_111",
        "fullName": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### Endpoint: Get Phone Payment by Tracking ID (Public)

**Purpose:** Get phone payment details using the tracking ID from SMS link.

**Method:** `GET`
**Path:** `/payments/claim/phone/:trackingId`
**Authentication:** ❌ Not required (public endpoint for claim page)

#### Request

**TypeScript Example:**
```typescript
const getPhonePaymentByTrackingId = async (trackingId: string) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${baseURL}/payments/claim/phone/${trackingId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment not found');
  }

  return await response.json();
};

// Usage: Extract trackingId from URL
// URL: http://localhost:5173/claim/phone/track_phone_abc
const trackingId = 'track_phone_abc'; // from useParams() in React Router
const payment = await getPhonePaymentByTrackingId(trackingId);
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "phone_pay_123",
    "recipientPhone": "+1234567890",
    "amount": "75.00",
    "currency": "USDC",
    "status": "PENDING",
    "personalMessage": "Payment for concert tickets",
    "expiresAt": "2025-11-19T10:00:00.000Z",
    "createdAt": "2025-11-09T10:00:00.000Z",
    "sender": {
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Endpoint: Claim Phone Payment

**Purpose:** Claim a phone payment (user must be logged in and phone number must match).

**Method:** `POST`
**Path:** `/payments/phone/:paymentId/claim`
**Authentication:** ✅ Required

#### Request

**TypeScript Example:**
```typescript
const claimPhonePayment = async (paymentId: string) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/phone/${paymentId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to claim payment');
  }

  return await response.json();
};

// Usage
const claimed = await claimPhonePayment('phone_pay_123');
```

#### Response

```json
{
  "success": true,
  "message": "Payment claimed successfully",
  "data": {
    "id": "phone_pay_123",
    "recipientPhone": "+1234567890",
    "recipientId": "user_456",
    "amount": "75.00",
    "status": "CLAIMED",
    "claimedAt": "2025-11-09T11:00:00.000Z",
    "transaction": {
      "id": "tx_999",
      "type": "PHONE_CLAIM",
      "status": "COMPLETED",
      "txHash": "0xabc123..."
    }
  }
}
```

#### Error Responses

**Phone number doesn't match:**
```json
{
  "success": false,
  "error": "This payment is not for you"
}
```

**Payment already claimed:**
```json
{
  "success": false,
  "error": "Payment already claimed"
}
```

**Payment expired:**
```json
{
  "success": false,
  "error": "Payment has expired"
}
```

### Endpoint: Cancel Phone Payment

**Purpose:** Cancel a pending phone payment (sender only).

**Method:** `POST`
**Path:** `/payments/phone/:paymentId/cancel`
**Authentication:** ✅ Required

#### Request

**TypeScript Example:**
```typescript
const cancelPhonePayment = async (paymentId: string) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/phone/${paymentId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel payment');
  }

  return await response.json();
};
```

#### Response

```json
{
  "success": true,
  "message": "Payment cancelled and refunded successfully",
  "data": {
    "id": "phone_pay_123",
    "status": "CANCELLED",
    "refundedAt": "2025-11-09T12:00:00.000Z"
  }
}
```

---

## Email Payment Feature

### Endpoint: Send to Email

**Method:** `POST`
**Path:** `/payments/email`
**Authentication:** ✅ Required

#### Request

**Request Body:**
```typescript
{
  "recipientEmail": string,
  "amount": string,
  "personalMessage"?: string,
  "referenceNote"?: string,
  "expirationDays"?: number
}
```

**TypeScript Example:**
```typescript
const sendToEmail = async (data: {
  recipientEmail: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/payments/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};
```

#### Response

```json
{
  "success": true,
  "message": "Payment sent via email",
  "data": {
    "emailPayment": {
      "id": "email_pay_123",
      "senderEmail": "sender@example.com",
      "recipientEmail": "recipient@example.com",
      "amount": "50.00",
      "status": "PENDING",
      "emailTrackingId": "track_email_xyz",
      "expiresAt": "2025-11-16T10:00:00.000Z"
    },
    "claimUrl": "http://localhost:5173/claim/email/track_email_xyz"
  }
}
```

### Other Email Endpoints

Similar to phone payments:
- `GET /payments/email/sent` - Get sent email payments
- `GET /payments/email/received` - Get received email payments
- `GET /payments/claim/email/:trackingId` - Get email payment by tracking ID (public)
- `POST /payments/email/:paymentId/claim` - Claim email payment
- `POST /payments/email/:paymentId/cancel` - Cancel email payment

---

## Wallet Payment Feature

### Endpoint: Send to Wallet

**Method:** `POST`
**Path:** `/transactions/send`
**Authentication:** ✅ Required

#### Request

**Request Body:**
```typescript
{
  "recipientAddress": string,  // Ethereum wallet address (0x...)
  "amount": string,
  "referenceNote"?: string
}
```

**TypeScript Example:**
```typescript
const sendToWallet = async (data: {
  recipientAddress: string;
  amount: string;
  referenceNote?: string;
}) => {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(`${baseURL}/transactions/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  return await response.json();
};
```

#### Response

```json
{
  "success": true,
  "message": "Transaction successful",
  "data": {
    "transaction": {
      "id": "tx_123",
      "type": "SEND",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "amount": "100.00",
      "status": "COMPLETED",
      "txHash": "0xabcdef...",
      "network": "BASE_MAINNET"
    }
  }
}
```

---

## Complete Frontend Implementation Examples

### 1. Unified Send Form Component (React + TypeScript)

```typescript
import React, { useState, useEffect } from 'react';

interface RecipientPreview {
  type: 'WALLET' | 'EMAIL' | 'PHONE' | 'UNKNOWN';
  valid: boolean;
  formattedRecipient?: string;
  message: string;
}

const UnifiedSendForm: React.FC = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [expirationDays, setExpirationDays] = useState(7);

  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  // Preview recipient type as user types
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (recipient.trim().length > 3) {
        try {
          const response = await fetch(
            `${baseURL}/transactions/preview?recipient=${encodeURIComponent(recipient)}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );
          const data = await response.json();
          if (data.success) {
            setPreview(data.data);
          }
        } catch (err) {
          console.error('Preview error:', err);
        }
      } else {
        setPreview(null);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(debounce);
  }, [recipient, baseURL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${baseURL}/transactions/send-unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient,
          amount,
          personalMessage: personalMessage || undefined,
          expirationDays: preview?.type !== 'WALLET' ? expirationDays : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send payment');
      }

      const data = await response.json();
      console.log('Payment sent:', data);

      setSuccess(true);
      setRecipient('');
      setAmount('');
      setPersonalMessage('');

      // Show success message based on recipient type
      if (data.recipientType === 'EMAIL') {
        alert(`Payment sent via email! Claim link: ${data.data.claimUrl}`);
      } else if (data.recipientType === 'PHONE') {
        alert(`Payment sent via SMS! Claim link: ${data.data.claimUrl}`);
      } else {
        alert(`Payment sent to wallet! Transaction hash: ${data.data.transaction.txHash}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientTypeIcon = () => {
    if (!preview) return null;
    switch (preview.type) {
      case 'EMAIL': return '📧';
      case 'PHONE': return '📱';
      case 'WALLET': return '💳';
      default: return '❓';
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Send USDC</h2>

      <form onSubmit={handleSubmit}>
        {/* Recipient Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Recipient (Wallet, Email, or Phone)
          </label>
          <div className="relative">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x... or user@example.com or +1234567890"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            {preview && (
              <div className="absolute right-3 top-2 text-2xl">
                {getRecipientTypeIcon()}
              </div>
            )}
          </div>

          {/* Preview Message */}
          {preview && (
            <div className={`mt-2 text-sm p-2 rounded ${
              preview.valid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {preview.message}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Personal Message (only for email/phone) */}
        {preview && preview.type !== 'WALLET' && preview.valid && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add a note to the recipient..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        )}

        {/* Expiration Days (only for email/phone) */}
        {preview && preview.type !== 'WALLET' && preview.valid && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Expiration (Days)
            </label>
            <select
              value={expirationDays}
              onChange={(e) => setExpirationDays(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days (Default)</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
            Payment sent successfully!
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !preview?.valid}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
            loading || !preview?.valid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Sending...' : `Send ${amount || '0.00'} USDC`}
        </button>
      </form>
    </div>
  );
};

export default UnifiedSendForm;
```

### 2. Phone Payment Claim Page Component

```typescript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface PhonePayment {
  id: string;
  recipientPhone: string;
  amount: string;
  currency: string;
  status: string;
  personalMessage?: string;
  expiresAt: string;
  sender: {
    fullName: string;
    email: string;
  };
}

const PhoneClaimPage: React.FC = () => {
  const { trackingId } = useParams<{ trackingId: string }>();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<PhonePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');
  const isLoggedIn = !!accessToken;

  // Fetch payment details
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await fetch(
          `${baseURL}/payments/claim/phone/${trackingId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error('Payment not found or expired');
        }

        const data = await response.json();
        setPayment(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [trackingId, baseURL]);

  const handleClaim = async () => {
    if (!isLoggedIn) {
      // Redirect to login, then back to claim page
      navigate(`/login?redirect=/claim/phone/${trackingId}`);
      return;
    }

    if (!payment) return;

    setClaiming(true);
    setError('');

    try {
      const response = await fetch(
        `${baseURL}/payments/phone/${payment.id}/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim payment');
      }

      const data = await response.json();
      console.log('Payment claimed:', data);

      // Redirect to success page or dashboard
      alert('Payment claimed successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading payment details...</div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error || 'Payment not found'}</p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(payment.expiresAt) < new Date();
  const isClaimed = payment.status === 'CLAIMED';
  const daysUntilExpiry = Math.ceil(
    (new Date(payment.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">💰</div>
          <h1 className="text-3xl font-bold text-gray-800">
            You've Got USDC!
          </h1>
        </div>

        {/* Sender Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">From</p>
          <p className="text-lg font-semibold">{payment.sender.fullName}</p>
          <p className="text-sm text-gray-500">{payment.sender.email}</p>
        </div>

        {/* Amount */}
        <div className="mb-6 text-center">
          <p className="text-4xl font-bold text-green-600">
            {payment.amount} {payment.currency}
          </p>
        </div>

        {/* Personal Message */}
        {payment.personalMessage && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Message</p>
            <p className="text-gray-800">{payment.personalMessage}</p>
          </div>
        )}

        {/* Status Messages */}
        {isClaimed && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
            ✅ This payment has already been claimed
          </div>
        )}

        {isExpired && !isClaimed && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            ⏰ This payment has expired
          </div>
        )}

        {!isClaimed && !isExpired && (
          <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
            ⏳ Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Claim Button */}
        {!isClaimed && !isExpired && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
              claiming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {claiming ? 'Claiming...' : isLoggedIn ? 'Claim Payment' : 'Login to Claim'}
          </button>
        )}

        {!isLoggedIn && (
          <p className="mt-4 text-sm text-center text-gray-600">
            You'll need to log in or create an account to claim this payment
          </p>
        )}
      </div>
    </div>
  );
};

export default PhoneClaimPage;
```

### 3. API Service Layer (Axios)

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============= UNIFIED SEND =============

export const previewRecipient = async (recipient: string) => {
  const response = await api.get('/transactions/preview', {
    params: { recipient },
  });
  return response.data;
};

export const sendUnified = async (data: {
  recipient: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}) => {
  const response = await api.post('/transactions/send-unified', data);
  return response.data;
};

// ============= PHONE PAYMENTS =============

export const sendToPhone = async (data: {
  recipientPhone: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}) => {
  const response = await api.post('/payments/phone', data);
  return response.data;
};

export const getSentPhonePayments = async () => {
  const response = await api.get('/payments/phone/sent');
  return response.data;
};

export const getReceivedPhonePayments = async () => {
  const response = await api.get('/payments/phone/received');
  return response.data;
};

export const getPhonePaymentByTrackingId = async (trackingId: string) => {
  // No auth required for this endpoint
  const response = await axios.get(
    `${baseURL}/payments/claim/phone/${trackingId}`,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response.data;
};

export const claimPhonePayment = async (paymentId: string) => {
  const response = await api.post(`/payments/phone/${paymentId}/claim`);
  return response.data;
};

export const cancelPhonePayment = async (paymentId: string) => {
  const response = await api.post(`/payments/phone/${paymentId}/cancel`);
  return response.data;
};

// ============= EMAIL PAYMENTS =============

export const sendToEmail = async (data: {
  recipientEmail: string;
  amount: string;
  personalMessage?: string;
  referenceNote?: string;
  expirationDays?: number;
}) => {
  const response = await api.post('/payments/email', data);
  return response.data;
};

export const getSentEmailPayments = async () => {
  const response = await api.get('/payments/email/sent');
  return response.data;
};

export const getReceivedEmailPayments = async () => {
  const response = await api.get('/payments/email/received');
  return response.data;
};

export const getEmailPaymentByTrackingId = async (trackingId: string) => {
  const response = await axios.get(
    `${baseURL}/payments/claim/email/${trackingId}`,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  return response.data;
};

export const claimEmailPayment = async (paymentId: string) => {
  const response = await api.post(`/payments/email/${paymentId}/claim`);
  return response.data;
};

export const cancelEmailPayment = async (paymentId: string) => {
  const response = await api.post(`/payments/email/${paymentId}/cancel`);
  return response.data;
};

// ============= WALLET PAYMENTS =============

export const sendToWallet = async (data: {
  recipientAddress: string;
  amount: string;
  referenceNote?: string;
}) => {
  const response = await api.post('/transactions/send', data);
  return response.data;
};

export default api;
```

### 4. React Hook for Phone Payments

```typescript
// src/hooks/usePhonePayments.ts
import { useState, useEffect } from 'react';
import {
  getSentPhonePayments,
  getReceivedPhonePayments,
  sendToPhone,
  claimPhonePayment,
  cancelPhonePayment,
} from '../services/api';

export const usePhonePayments = () => {
  const [sentPayments, setSentPayments] = useState([]);
  const [receivedPayments, setReceivedPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSentPayments = async () => {
    setLoading(true);
    try {
      const data = await getSentPhonePayments();
      setSentPayments(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedPayments = async () => {
    setLoading(true);
    try {
      const data = await getReceivedPhonePayments();
      setReceivedPayments(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async (paymentData: {
    recipientPhone: string;
    amount: string;
    personalMessage?: string;
    expirationDays?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendToPhone(paymentData);
      await fetchSentPayments(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const claim = async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await claimPhonePayment(paymentId);
      await fetchReceivedPayments(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (paymentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await cancelPhonePayment(paymentId);
      await fetchSentPayments(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentPayments();
    fetchReceivedPayments();
  }, []);

  return {
    sentPayments,
    receivedPayments,
    loading,
    error,
    send,
    claim,
    cancel,
    refresh: () => {
      fetchSentPayments();
      fetchReceivedPayments();
    },
  };
};
```

---

## Error Handling

### Common Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes

- **200** - Success
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid or missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

### Example Error Handling

```typescript
try {
  const response = await fetch(`${baseURL}/payments/phone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();

    // Handle specific error cases
    if (response.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return;
    }

    if (response.status === 400) {
      // Validation error - show to user
      throw new Error(errorData.error || 'Invalid input');
    }

    if (response.status === 403) {
      // Insufficient permissions
      throw new Error('You do not have permission to perform this action');
    }

    if (response.status === 404) {
      // Resource not found
      throw new Error('Payment not found');
    }

    // Generic error
    throw new Error(errorData.error || 'An error occurred');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Show error to user
  alert(error.message);
}
```

### Common Error Messages

**Phone Payments:**
- "Invalid phone number"
- "This payment is not for you"
- "Payment already claimed"
- "Payment has expired"
- "Insufficient balance"
- "You can only cancel payments you sent"

**Email Payments:**
- "Invalid email address"
- "This payment is not for you"
- "Payment already claimed"
- "Payment has expired"

**Wallet Payments:**
- "Invalid wallet address"
- "Insufficient balance"
- "Transaction failed"

---

## Testing Guide

### Testing Locally

1. **Start Backend:**
```bash
cd maya-pay-hub
npm run dev
# Backend runs on http://localhost:3000
```

2. **Configure Frontend .env:**
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_URL=http://localhost:5173
```

3. **Test Unified Send:**
```typescript
// Test with email
await sendUnified({
  recipient: 'test@example.com',
  amount: '10.00',
  personalMessage: 'Test payment'
});

// Test with phone
await sendUnified({
  recipient: '+1234567890',
  amount: '20.00'
});

// Test with wallet
await sendUnified({
  recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  amount: '50.00'
});
```

### Testing on Production

1. **Update .env:**
```bash
VITE_API_BASE_URL=https://your-production-domain.com/api
VITE_APP_URL=https://your-frontend-domain.com
```

2. **Test Network Switching:**
- Ensure backend is configured for correct network (mainnet/testnet)
- Verify USDC contract addresses match network

### Testing SMS (Phone Payments)

**Important:** SMS will only work if backend has valid Twilio credentials.

1. Backend must have in `.env`:
```bash
TWILIO_ACCOUNT_SID=your-actual-twilio-sid
TWILIO_AUTH_TOKEN=your-actual-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

2. Test phone payment:
```typescript
const result = await sendToPhone({
  recipientPhone: '+1234567890', // Use your real phone for testing
  amount: '1.00',
  personalMessage: 'Test SMS payment'
});
console.log('Claim URL:', result.data.claimUrl);
// Check your phone for SMS
```

### Testing Email Payments

1. Backend must have email service configured (SendGrid, AWS SES, etc.)

2. Test email payment:
```typescript
const result = await sendToEmail({
  recipientEmail: 'your-test-email@example.com',
  amount: '1.00',
  personalMessage: 'Test email payment'
});
// Check your email for claim link
```

### Test Checklist

- [ ] Preview endpoint detects wallet addresses correctly
- [ ] Preview endpoint detects email addresses correctly
- [ ] Preview endpoint detects phone numbers correctly
- [ ] Unified send works for wallet addresses
- [ ] Unified send works for emails
- [ ] Unified send works for phone numbers
- [ ] Phone payment sends SMS successfully
- [ ] Email payment sends email successfully
- [ ] Claim page loads for phone payments
- [ ] Claim page loads for email payments
- [ ] Users can claim phone payments
- [ ] Users can claim email payments
- [ ] Sender can cancel pending payments
- [ ] Expired payments cannot be claimed
- [ ] Already claimed payments show correct status
- [ ] Error handling works for all endpoints
- [ ] Authentication works correctly
- [ ] Token refresh works when token expires

---

## Additional Notes

### Phone Number Formats

The backend accepts multiple phone formats and converts to E.164:
- `+1234567890` (E.164 - preferred)
- `1234567890` (10 digits - assumes US)
- `11234567890` (11 digits starting with 1)
- International formats with country codes

### SMS Message Format

Users receive this SMS:
```
💰 [Sender Name] sent you [Amount] USDC!

Message: "[Personal Message]"

Claim your payment here:
[Claim URL]

Expires in [X] days.

Powered by Maya Pay
```

### Email Message Format

Similar to SMS but with HTML formatting and better styling.

### Security Considerations

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies recommended for production)
3. **Validate user input** on frontend before sending to backend
4. **Handle token expiration** gracefully
5. **Never expose sensitive data** in error messages
6. **Use environment variables** for all configuration

### Performance Tips

1. **Debounce preview requests** (as shown in example - 500ms)
2. **Cache payment lists** and refresh periodically
3. **Show loading states** for all async operations
4. **Implement pagination** for large payment lists
5. **Use optimistic UI updates** when possible

---

## Summary

This integration guide provides everything needed to implement:

1. ✅ **Unified Send** - Auto-detect recipient type and send payments
2. ✅ **Phone Payments** - Send USDC via SMS with claim flow
3. ✅ **Email Payments** - Send USDC via email with claim flow
4. ✅ **Wallet Payments** - Direct blockchain transfers

All endpoints are documented with:
- Complete request/response examples
- TypeScript code snippets
- React component examples
- Error handling patterns
- Testing instructions

The Loveable.dev team should have everything needed to build a complete, production-ready frontend for Maya Pay Hub.

---

**Last Updated:** January 9, 2025
**Backend Version:** 1.0.0
**Contact:** For questions about this integration, please contact the backend development team.
