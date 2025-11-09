# PROMPT FOR LOVEABLE.DEV - MAYA PAY HUB FRONTEND INTEGRATION

Copy and paste this entire prompt to Loveable.dev to build the complete frontend integration.

---

## PROJECT OVERVIEW

I need you to build a complete frontend for **Maya Pay Hub** - a cross-border USDC payment platform built on Base blockchain with Web3Auth authentication and three payment methods: wallet, email, and phone number.

---

## CORE FEATURES TO IMPLEMENT

The backend supports **THREE payment methods**:
1. 💳 **Wallet Address** - Direct blockchain transfer to Ethereum addresses
2. 📧 **Email Payment** - Send USDC to email with escrow + claim flow (expires in 7-30 days)
3. 📱 **Phone Payment** - Send USDC to phone with SMS notification + claim flow (expires in 7-30 days)

Plus:
4. 🔄 **Unified Send** - Automatically detects recipient type (wallet/email/phone) and routes payment

---

## BACKEND API CONFIGURATION

### URLs

**Local Development:**
```
Base URL: http://localhost:3000/api
```

**Production:**
```
Base URL: https://your-production-domain.com/api
```
*(Replace with actual deployed backend URL)*

### Environment Variables

Create these in your frontend:
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_URL=http://localhost:5173
```

### Authentication

All protected endpoints require JWT authentication:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {accessToken}'
}
```

After login, store the `accessToken` from the response:
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc..."
    }
  }
}
```

---

## COMPLETE API ENDPOINTS DOCUMENTATION

### 1. UNIFIED SEND (RECOMMENDED APPROACH)

#### 1.1 Preview Recipient Type (Public endpoint)

**Purpose:** Check what type of recipient the user entered (wallet/email/phone) before sending payment.

**Endpoint:** `GET /transactions/preview?recipient={value}`

**No authentication required**

**Example Request:**
```typescript
const response = await fetch(
  `${baseURL}/transactions/preview?recipient=${encodeURIComponent('user@example.com')}`,
  {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }
);
```

**Response Examples:**

For Email:
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

For Phone:
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

For Wallet:
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

For Invalid:
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

#### 1.2 Unified Send Payment (Authenticated)

**Purpose:** Send USDC to any recipient type - automatically detects and routes.

**Endpoint:** `POST /transactions/send-unified`

**Authentication:** Required

**Request Body:**
```typescript
{
  "recipient": string,           // Email, phone, or wallet address
  "amount": string,              // Amount in USDC (e.g., "10.50")
  "personalMessage"?: string,    // Optional (only for email/phone)
  "referenceNote"?: string,      // Optional internal note
  "expirationDays"?: number      // Optional (only for email/phone), defaults to 7
}
```

**Example Request:**
```typescript
const response = await fetch(`${baseURL}/transactions/send-unified`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    recipient: 'user@example.com',
    amount: '50.00',
    personalMessage: 'Thanks for lunch!',
    expirationDays: 7
  })
});
```

**Response for Email Payment:**
```json
{
  "success": true,
  "message": "Payment sent via email successfully",
  "recipientType": "EMAIL",
  "data": {
    "emailPayment": {
      "id": "email_pay_123",
      "recipientEmail": "user@example.com",
      "amount": "50.00",
      "status": "PENDING",
      "emailTrackingId": "track_abc123",
      "expiresAt": "2025-11-16T10:00:00.000Z"
    },
    "transaction": {
      "id": "tx_789",
      "type": "EMAIL_PAYMENT",
      "amount": "50.00"
    },
    "claimUrl": "http://localhost:5173/claim/email/track_abc123"
  }
}
```

**Response for Phone Payment:**
```json
{
  "success": true,
  "message": "Payment sent via SMS successfully",
  "recipientType": "PHONE",
  "data": {
    "phonePayment": {
      "id": "phone_pay_123",
      "recipientPhone": "+1234567890",
      "amount": "25.50",
      "status": "PENDING",
      "smsTrackingId": "track_xyz789",
      "smsSentAt": "2025-11-09T10:00:00.000Z",
      "expiresAt": "2025-11-23T10:00:00.000Z"
    },
    "claimUrl": "http://localhost:5173/claim/phone/track_xyz789"
  }
}
```

**Response for Wallet Payment:**
```json
{
  "success": true,
  "message": "Payment sent to wallet successfully",
  "recipientType": "WALLET",
  "data": {
    "transaction": {
      "id": "tx_791",
      "type": "SEND",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "amount": "100.00",
      "status": "COMPLETED",
      "txHash": "0xabcdef123456..."
    }
  }
}
```

---

### 2. PHONE PAYMENT ENDPOINTS

#### 2.1 Send to Phone Number

**Endpoint:** `POST /payments/phone`

**Authentication:** Required

**Request Body:**
```typescript
{
  "recipientPhone": string,      // Phone number (+1234567890, 1234567890, etc.)
  "amount": string,              // Amount in USDC
  "personalMessage"?: string,    // Optional message
  "referenceNote"?: string,      // Optional internal note
  "expirationDays"?: number      // Optional, defaults to 7
}
```

**Example:**
```typescript
const response = await fetch(`${baseURL}/payments/phone`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    recipientPhone: '+1234567890',
    amount: '75.00',
    personalMessage: 'Payment for concert tickets',
    expirationDays: 10
  })
});
```

**Response:**
```json
{
  "success": true,
  "message": "Payment sent via SMS",
  "data": {
    "phonePayment": {
      "id": "phone_pay_123",
      "recipientPhone": "+1234567890",
      "amount": "75.00",
      "status": "PENDING",
      "smsTrackingId": "track_phone_abc",
      "expiresAt": "2025-11-19T10:00:00.000Z"
    },
    "claimUrl": "http://localhost:5173/claim/phone/track_phone_abc"
  }
}
```

#### 2.2 Get Sent Phone Payments

**Endpoint:** `GET /payments/phone/sent`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "phone_pay_123",
      "recipientPhone": "+1234567890",
      "amount": "75.00",
      "status": "PENDING",
      "personalMessage": "Payment for concert tickets",
      "expiresAt": "2025-11-19T10:00:00.000Z",
      "createdAt": "2025-11-09T10:00:00.000Z"
    }
  ]
}
```

#### 2.3 Get Received Phone Payments

**Endpoint:** `GET /payments/phone/received`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "phone_pay_789",
      "recipientPhone": "+1234567890",
      "amount": "100.00",
      "status": "PENDING",
      "personalMessage": "Birthday gift!",
      "sender": {
        "fullName": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

#### 2.4 Get Phone Payment by Tracking ID (Public)

**Endpoint:** `GET /payments/claim/phone/:trackingId`

**No authentication required** (used for claim page before login)

**Example:**
```typescript
const response = await fetch(
  `${baseURL}/payments/claim/phone/track_phone_abc`,
  {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }
);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "phone_pay_123",
    "recipientPhone": "+1234567890",
    "amount": "75.00",
    "status": "PENDING",
    "personalMessage": "Payment for concert tickets",
    "expiresAt": "2025-11-19T10:00:00.000Z",
    "sender": {
      "fullName": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

#### 2.5 Claim Phone Payment

**Endpoint:** `POST /payments/phone/:paymentId/claim`

**Authentication:** Required (user's phone must match recipient phone)

**Response:**
```json
{
  "success": true,
  "message": "Payment claimed successfully",
  "data": {
    "id": "phone_pay_123",
    "status": "CLAIMED",
    "claimedAt": "2025-11-09T11:00:00.000Z",
    "transaction": {
      "txHash": "0xabc123..."
    }
  }
}
```

**Possible Errors:**
- "This payment is not for you" (phone doesn't match)
- "Payment already claimed"
- "Payment has expired"

#### 2.6 Cancel Phone Payment

**Endpoint:** `POST /payments/phone/:paymentId/cancel`

**Authentication:** Required (only sender can cancel)

**Response:**
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

### 3. EMAIL PAYMENT ENDPOINTS

Same structure as phone payments but use `/payments/email` endpoints:

- `POST /payments/email` - Send to email
- `GET /payments/email/sent` - Get sent email payments
- `GET /payments/email/received` - Get received email payments
- `GET /payments/claim/email/:trackingId` - Get by tracking ID (public)
- `POST /payments/email/:paymentId/claim` - Claim email payment
- `POST /payments/email/:paymentId/cancel` - Cancel email payment

Request/response formats are identical to phone payments, just replace `recipientPhone` with `recipientEmail` and `phonePayment` with `emailPayment`.

---

### 4. WALLET PAYMENT ENDPOINT

**Endpoint:** `POST /transactions/send`

**Authentication:** Required

**Request Body:**
```typescript
{
  "recipientAddress": string,  // Ethereum address (0x...)
  "amount": string,
  "referenceNote"?: string
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "tx_123",
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

## FRONTEND COMPONENTS TO BUILD

### 1. UNIFIED SEND FORM

Build a form with these features:

**Fields:**
- Recipient input (accepts wallet/email/phone)
- Amount input (USDC)
- Personal message (textarea, optional, only shown for email/phone)
- Expiration days (dropdown: 1, 3, 7, 14, 30 days, only shown for email/phone)

**Real-time Recipient Detection:**
- As user types in recipient field, call `/transactions/preview` with 500ms debounce
- Show an icon based on detected type:
  - 💳 for wallet
  - 📧 for email
  - 📱 for phone
  - ❓ for unknown/invalid
- Display validation message below input (green for valid, red for invalid)

**Conditional Fields:**
- Only show "Personal Message" and "Expiration Days" when type is EMAIL or PHONE
- Hide these fields when type is WALLET

**Submit Behavior:**
- Call `POST /transactions/send-unified` with the form data
- Show loading state during submission
- On success:
  - If EMAIL or PHONE: Show success modal with claim link that user can copy/share
  - If WALLET: Show success with transaction hash
- On error: Display error message from API

**UI/UX Requirements:**
- Disabled submit button if recipient is invalid
- Show loading spinner during API calls
- Clear form after successful submission
- Responsive design for mobile

---

### 2. PHONE CLAIM PAGE

Build a public claim page at `/claim/phone/:trackingId`

**Page Flow:**

1. **Load Payment Details** (no auth required):
   - Call `GET /payments/claim/phone/:trackingId`
   - Extract trackingId from URL params

2. **Display Payment Info:**
   - Large amount (e.g., "75.00 USDC" in big bold text)
   - Sender's name and email
   - Personal message (if exists)
   - Expiration countdown (e.g., "Expires in 7 days")

3. **Status Indicators:**
   - Green badge if status is CLAIMED: "✅ Already claimed"
   - Red badge if expired: "⏰ Expired"
   - Yellow badge if pending: "⏳ Expires in X days"

4. **Claim Button:**
   - If not logged in: Button text "Login to Claim" → redirect to login with return URL
   - If logged in: Button text "Claim Payment" → call `POST /payments/phone/:paymentId/claim`

5. **After Claiming:**
   - Show success message
   - Redirect to dashboard

**Error Handling:**
- If tracking ID not found: Show "Payment not found" error page
- If phone doesn't match: Show "This payment is not for you" error
- If already claimed: Show claimed status with message
- If expired: Show expired status

---

### 3. EMAIL CLAIM PAGE

Identical to phone claim page but use `/claim/email/:trackingId` route and email endpoints.

---

### 4. SENT PAYMENTS LIST

Build a page showing sent payments (both email and phone):

**Data Sources:**
- Fetch from `GET /payments/phone/sent`
- Fetch from `GET /payments/email/sent`
- Combine and display in one list

**Each List Item Shows:**
- Recipient (masked phone/email)
- Amount
- Status badge (PENDING, CLAIMED, EXPIRED, CANCELLED)
- Date sent
- Expiration date (for pending payments)
- Cancel button (only for PENDING payments)

**Actions:**
- Click item to view details
- Click cancel to call `/payments/phone/:paymentId/cancel` or `/payments/email/:paymentId/cancel`

---

### 5. RECEIVED PAYMENTS LIST

Similar to sent payments but use:
- `GET /payments/phone/received`
- `GET /payments/email/received`

**Each Item Shows:**
- Sender name
- Amount
- Status
- Personal message preview
- Claim button (for PENDING payments)

---

## COMPLETE CODE EXAMPLES

### Example 1: Unified Send Form Component

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

  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');

  // Real-time recipient preview with debouncing
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (recipient.trim().length > 3) {
        try {
          const response = await fetch(
            `${baseURL}/transactions/preview?recipient=${encodeURIComponent(recipient)}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
          );
          const data = await response.json();
          if (data.success) setPreview(data.data);
        } catch (err) {
          console.error('Preview error:', err);
        }
      } else {
        setPreview(null);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [recipient, baseURL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${baseURL}/transactions/send-unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          recipient,
          amount,
          personalMessage: personalMessage || undefined,
          expirationDays: preview?.type !== 'WALLET' ? expirationDays : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send payment');
      }

      const data = await response.json();

      // Show success based on type
      if (data.recipientType === 'EMAIL' || data.recipientType === 'PHONE') {
        alert(`Payment sent! Claim link: ${data.data.claimUrl}`);
      } else {
        alert(`Payment sent! TX: ${data.data.transaction.txHash}`);
      }

      // Clear form
      setRecipient('');
      setAmount('');
      setPersonalMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRecipientIcon = () => {
    if (!preview) return null;
    const icons = { EMAIL: '📧', PHONE: '📱', WALLET: '💳', UNKNOWN: '❓' };
    return icons[preview.type];
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
                {getRecipientIcon()}
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
          <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
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
              placeholder="Add a note..."
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

### Example 2: Phone Claim Page

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

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await fetch(
          `${baseURL}/payments/claim/phone/${trackingId}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) throw new Error('Payment not found or expired');

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
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim payment');
      }

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
          <h1 className="text-3xl font-bold text-gray-800">You've Got USDC!</h1>
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
              claiming ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
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

### Example 3: API Service Layer

```typescript
import axios, { AxiosInstance } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============= UNIFIED SEND =============
export const previewRecipient = async (recipient: string) => {
  const response = await api.get('/transactions/preview', { params: { recipient } });
  return response.data;
};

export const sendUnified = async (data: {
  recipient: string;
  amount: string;
  personalMessage?: string;
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
  const response = await axios.get(`${baseURL}/payments/claim/phone/${trackingId}`);
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

export const claimEmailPayment = async (paymentId: string) => {
  const response = await api.post(`/payments/email/${paymentId}/claim`);
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

---

## ERROR HANDLING

All errors return this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes:
- **200** - Success
- **400** - Bad Request (validation error)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden
- **404** - Not Found
- **500** - Internal Server Error

### Common Error Messages:
- "Invalid phone number"
- "Invalid email address"
- "Invalid wallet address"
- "This payment is not for you"
- "Payment already claimed"
- "Payment has expired"
- "Insufficient balance"
- "You can only cancel payments you sent"

### Error Handling Example:
```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return;
    }

    throw new Error(errorData.error || 'An error occurred');
  }

  return await response.json();
} catch (error: any) {
  console.error('API Error:', error);
  alert(error.message);
}
```

---

## DESIGN REQUIREMENTS

### Visual Design:
- Clean, modern UI with rounded corners and subtle shadows
- Use green for success states (#10B981)
- Use red for errors (#EF4444)
- Use yellow for warnings (#F59E0B)
- Use blue for primary actions (#3B82F6)

### Icons to Use:
- 💳 Wallet payments
- 📧 Email payments
- 📱 Phone payments
- ✅ Success/claimed
- ⏰ Expired
- ⏳ Pending/expiring
- ❓ Unknown/invalid

### Responsive Design:
- Mobile-first approach
- All forms should work on small screens
- Buttons should be large enough to tap on mobile
- Use proper spacing and padding

### Loading States:
- Show spinner during API calls
- Disable buttons during submission
- Change button text to "Sending...", "Claiming...", etc.

### Form Validation:
- Required fields marked with asterisk (*)
- Real-time validation feedback
- Clear error messages near input fields
- Disable submit if form is invalid

---

## ROUTES TO IMPLEMENT

```
/send - Unified send form
/claim/phone/:trackingId - Phone claim page (public)
/claim/email/:trackingId - Email claim page (public)
/payments/sent - List of sent payments
/payments/received - List of received payments
```

---

## TESTING CHECKLIST

Before marking as complete, test:

- [ ] Preview endpoint detects wallets correctly (0x...)
- [ ] Preview endpoint detects emails correctly
- [ ] Preview endpoint detects phone numbers correctly
- [ ] Unified send works for all three types
- [ ] Phone claim page loads without authentication
- [ ] Email claim page loads without authentication
- [ ] Users can claim payments after logging in
- [ ] Claim button redirects to login if not authenticated
- [ ] Cancel button works for pending payments
- [ ] Expired payments show correct status
- [ ] Already claimed payments show correct status
- [ ] Personal messages display correctly
- [ ] Error messages are user-friendly
- [ ] Mobile responsive on all pages
- [ ] Loading states appear during API calls

---

## IMPORTANT NOTES

1. **Phone Number Formats:** Backend accepts multiple formats (+1234567890, 1234567890) and converts to E.164
2. **SMS Messages:** Users receive SMS like "💰 John sent you 50.00 USDC! Claim here: [link]"
3. **Security:** Always use HTTPS in production, validate inputs, handle token expiration
4. **Performance:** Debounce preview requests (500ms), show loading states, use optimistic UI where possible
5. **Backward Compatibility:** Some legacy routes exist but use the new routes documented here

---

## ADDITIONAL FEATURES (Optional Enhancement)

If you want to go beyond basics:

1. **QR Code Generation:** For claim links
2. **Share Functionality:** Share claim link via social media
3. **Copy to Clipboard:** For claim URLs and wallet addresses
4. **Transaction History:** Full list with filtering/search
5. **Analytics Dashboard:** Show charts of payment volume
6. **Notifications:** Real-time updates when payments are claimed

---

## SUMMARY

You now have EVERYTHING needed to build the complete Maya Pay Hub frontend:

✅ All API endpoints with full documentation
✅ Complete request/response examples
✅ Production-ready React/TypeScript code
✅ Error handling patterns
✅ Testing checklist
✅ Design guidelines

Build the components exactly as shown in the examples, use the API service layer for all backend calls, and implement proper error handling throughout. The result will be a fully functional payment platform supporting wallet, email, and phone payments with a seamless user experience.

**If you have ANY questions or need clarification on anything, please ask before starting implementation!**
