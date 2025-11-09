# Phone Payment & Unified Send - Feature Update

**Date:** January 9, 2025
**Version:** 1.1.0

This document describes the new phone payment functionality and unified send feature added to Maya Backend API.

---

## Overview

Maya now supports **three payment methods**:
1. 💳 **Wallet Address** - Direct blockchain transfer
2. 📧 **Email** - Escrow with email notification and claim link
3. 📱 **Phone Number** - Escrow with SMS notification and claim link

Additionally, a **Unified Send** endpoint automatically detects the recipient type and routes the payment accordingly.

---

## New API Endpoints

### Unified Send (Recommended)

#### Send to Any Recipient Type

**POST** `/api/transactions/send-unified`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipient": "user@example.com",  // or +1234567890 or 0x742d35Cc...
  "amount": "100.00",
  "personalMessage": "Thanks for everything!",
  "referenceNote": "Payment for services",
  "expirationDays": 30
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "recipientType": "EMAIL",  // or WALLET, PHONE
  "message": "Sent 100.00 USDC to user@example.com. Email notification sent with claim link.",
  "data": {
    "emailPayment": {
      "id": "emp_abc123",
      "amount": "100.00",
      "status": "PENDING",
      "expiresAt": "2025-02-08T10:00:00.000Z"
    },
    "transaction": {
      "id": "txn_xyz789",
      "status": "IN_ESCROW",
      "transactionType": "EMAIL_PAYMENT"
    },
    "trackingId": "1704801600000-abc123def456"
  }
}
```

#### Preview Recipient Type

**GET** `/api/transactions/preview?recipient={recipient}`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "type": "PHONE",
    "valid": true,
    "formattedRecipient": "+1234567890",
    "message": "Payment will be sent via SMS with claim link"
  }
}
```

---

### Phone Payment Endpoints

#### 1. Send Payment to Phone Number

**POST** `/api/payments/phone`

**Request Body:**
```json
{
  "recipientPhone": "+1234567890",
  "amount": "50.00",
  "personalMessage": "Happy Birthday! 🎂",
  "expirationDays": 30
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment sent via SMS",
  "data": {
    "phonePayment": {
      "id": "pmp_abc123",
      "recipientPhone": "+1234567890",
      "amount": "50.00",
      "status": "DELIVERED",
      "expiresAt": "2025-02-08T10:00:00.000Z",
      "smsTrackingId": "1704801600000-xyz789",
      "createdAt": "2025-01-09T10:00:00.000Z"
    },
    "transaction": {
      "id": "txn_def456",
      "status": "IN_ESCROW",
      "transactionType": "PHONE_PAYMENT"
    },
    "claimUrl": "https://maya-pay.com/claim/phone/1704801600000-xyz789"
  }
}
```

#### 2. Get Sent Phone Payments

**GET** `/api/payments/phone/sent?page=1&limit=20`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pmp_abc123",
        "recipientPhone": "+1234567890",
        "amount": "50.00",
        "status": "CLAIMED",
        "personalMessage": "Happy Birthday! 🎂",
        "createdAt": "2025-01-09T10:00:00.000Z",
        "claimedAt": "2025-01-09T12:00:00.000Z"
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

#### 3. Get Received Phone Payments

**GET** `/api/payments/phone/received?page=1&limit=20`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pmp_def456",
        "amount": "75.00",
        "status": "WAITING_CLAIM",
        "personalMessage": "Thanks!",
        "sender": {
          "fullName": "Alice Johnson",
          "phoneNumber": "+1987654321"
        },
        "expiresAt": "2025-02-08T10:00:00.000Z",
        "createdAt": "2025-01-08T14:00:00.000Z"
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

#### 4. Get Phone Payment by Tracking ID (Public)

**GET** `/api/payments/claim/phone/{trackingId}`

**No authentication required**

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "pmp_abc123",
    "amount": "50.00",
    "message": "Happy Birthday! 🎂",
    "status": "WAITING_CLAIM",
    "sender": {
      "fullName": "John Doe"
    },
    "expiresAt": "2025-02-08T10:00:00.000Z",
    "createdAt": "2025-01-09T10:00:00.000Z"
  }
}
```

#### 5. Claim Phone Payment

**POST** `/api/payments/phone/{paymentId}/claim`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment claimed successfully",
  "data": {
    "id": "pmp_abc123",
    "amount": "50.00",
    "status": "CLAIMED",
    "claimedAt": "2025-01-09T12:00:00.000Z",
    "sender": {
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### 6. Cancel Phone Payment

**POST** `/api/payments/phone/{paymentId}/cancel`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "reason": "Sent to wrong number"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment cancelled successfully",
  "data": {
    "id": "pmp_abc123",
    "status": "CANCELLED",
    "cancelledAt": "2025-01-09T13:00:00.000Z",
    "cancellationReason": "Sent to wrong number"
  }
}
```

---

## SMS Notifications

Phone payments trigger SMS notifications using Twilio:

### Configuration Required

Add to `.env`:
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### SMS Templates

#### Payment Notification
```
💰 {senderName} sent you ${amount} USDC!

Message: "{personalMessage}"

Claim your payment here:
{claimUrl}

Expires in {days} days.

Powered by Maya Pay
```

#### Payment Claimed
```
✅ Your payment of ${amount} USDC has been claimed by {recipientPhone}.

View details: {dashboardUrl}/transactions

Maya Pay
```

#### Claim Reminder
```
⏰ Reminder: {senderName} sent you ${amount} USDC.

Claim it before it expires in {daysLeft} days:
{claimUrl}

Maya Pay
```

---

## Frontend Integration

### Using Unified Send (Recommended)

```typescript
// Single function handles all payment types
async function sendPayment(recipient: string, amount: string) {
  const response = await api.post('/transactions/send-unified', {
    recipient,  // Email, phone, or wallet
    amount,
    personalMessage: 'Thanks!',
  });

  // Response tells you what type was detected
  console.log('Sent via:', response.data.recipientType);  // WALLET, EMAIL, or PHONE

  return response.data;
}

// Examples
sendPayment('user@example.com', '100');      // → EMAIL
sendPayment('+1234567890', '50');             // → PHONE
sendPayment('0x742d35Cc...', '200');          // → WALLET
```

### Preview Before Sending

```typescript
// Check what type of recipient before sending
async function previewRecipient(recipient: string) {
  const response = await api.get(`/transactions/preview?recipient=${recipient}`);

  return response.data;
  // {
  //   type: 'PHONE',
  //   valid: true,
  //   formattedRecipient: '+1234567890',
  //   message: 'Payment will be sent via SMS with claim link'
  // }
}
```

### Phone Payment Specific

```typescript
// Send specifically to phone number
async function sendToPhone(phone: string, amount: string, message: string) {
  const response = await api.post('/payments/phone', {
    recipientPhone: phone,
    amount,
    personalMessage: message,
    expirationDays: 30,
  });

  return response.data;
}

// Get sent phone payments
async function getSentPhonePayments(page = 1) {
  const response = await api.get(`/payments/phone/sent?page=${page}`);
  return response.data;
}

// Claim phone payment (after login)
async function claimPhonePayment(paymentId: string) {
  const response = await api.post(`/payments/phone/${paymentId}/claim`);
  return response.data;
}
```

---

## Database Schema Updates

### PhonePayment Model

```prisma
model PhonePayment {
  id                    String              @id @default(uuid())
  senderId              String
  senderPhone           String
  recipientPhone        String
  recipientId           String?

  amount                Decimal             @db.Decimal(19, 6)
  currency              String              @default("USDC")
  status                PhonePaymentStatus  @default(PENDING)

  // SMS tracking
  smsSentAt             DateTime?
  smsTrackingId         String              @unique
  smsMessageId          String?

  // Claim details
  claimedAt             DateTime?
  expiresAt             DateTime

  // Relations
  sender                User
  recipient             User?
  transaction           Transaction?
  escrow                Escrow?

  @@map("phone_payments")
}
```

### Transaction Model Updates

```prisma
model Transaction {
  // ... existing fields

  recipientPhone        String?
  isPhonePayment        Boolean             @default(false)
  phonePaymentId        String?             @unique
  phonePayment          PhonePayment?

  @@index([recipientPhone])
  @@index([isPhonePayment])
}
```

---

## Migration Guide

### For Existing Apps

1. **Update Environment Variables**
   ```bash
   # Add Twilio credentials
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

2. **Run Database Migration**
   ```bash
   npx prisma migrate dev --name add-phone-payments
   ```

3. **Update Frontend**
   - Option A: Switch to unified send endpoint (recommended)
   - Option B: Add phone payment support alongside email

4. **Test SMS Delivery**
   ```bash
   # Use test endpoint
   POST /api/admin/test/sms
   { "phone": "+1234567890" }
   ```

---

## Error Handling

### Phone Payment Errors

```typescript
try {
  await sendPhonePayment('+1234567890', '100');
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // Invalid phone number format
    console.error('Invalid phone number');
  } else if (error.code === 'INSUFFICIENT_BALANCE') {
    // Not enough USDC
    console.error('Insufficient balance');
  } else if (error.code === 'SMS_DELIVERY_FAILED') {
    // SMS failed to send (payment still created)
    console.warn('Payment created but SMS failed');
  }
}
```

### Unified Send Errors

```typescript
try {
  await unifiedSend('invalid-recipient', '100');
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // Invalid recipient format
    console.error('Must be wallet, email, or phone number');
  }
}
```

---

## Testing

### Test Phone Payments

```bash
# 1. Send phone payment
curl -X POST http://localhost:5000/api/payments/phone \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientPhone": "+1234567890",
    "amount": "10.00",
    "personalMessage": "Test payment"
  }'

# 2. Get claim page (public)
curl http://localhost:5000/api/payments/claim/phone/{trackingId}

# 3. Claim payment (authenticated)
curl -X POST http://localhost:5000/api/payments/phone/{paymentId}/claim \
  -H "Authorization: Bearer $TOKEN"
```

### Test Unified Send

```bash
# Test with email
curl -X POST http://localhost:5000/api/transactions/send-unified \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "user@example.com",
    "amount": "50.00"
  }'

# Test with phone
curl -X POST http://localhost:5000/api/transactions/send-unified \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1234567890",
    "amount": "25.00"
  }'

# Test with wallet
curl -X POST http://localhost:5000/api/transactions/send-unified \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "amount": "100.00"
  }'
```

---

## Benefits

### For Users
- ✅ Send USDC to anyone via phone number (no crypto knowledge needed)
- ✅ Instant SMS notifications
- ✅ Simple claim process
- ✅ Automatic refund after expiration

### For Developers
- ✅ Single unified endpoint for all payment types
- ✅ Auto-detection of recipient type
- ✅ Consistent API across wallet/email/phone
- ✅ Backward compatible with existing integrations

### For Business
- ✅ Expand user base (phone numbers more accessible)
- ✅ Lower barriers to entry (SMS vs crypto wallets)
- ✅ Better conversion rates (familiar UX)
- ✅ Global reach (international phone numbers)

---

## Support

For questions or issues:
- Backend API Docs: `docs/BACKEND_API_DOCUMENTATION.md`
- Frontend Guide: `docs/FRONTEND_INTEGRATION_GUIDE.md`
- Postman Collection: `docs/POSTMAN_COLLECTION.md`

---

**Last Updated:** January 9, 2025
**Feature Version:** 1.1.0
