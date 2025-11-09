# Maya Frontend Integration Guide

**For Loveable AI Development**

This guide provides comprehensive instructions for extending the Maya frontend to integrate with the backend API while maintaining the existing design system.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Design Prompt for Loveable](#design-prompt-for-loveable)
3. [Screens & Features to Implement](#screens--features-to-implement)
4. [API Integration Guidelines](#api-integration-guidelines)
5. [Component Structure](#component-structure)
6. [State Management](#state-management)
7. [Authentication Flow](#authentication-flow)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)

---

## Project Overview

**Maya** is a cross-border USDC payment platform with Web3Auth embedded wallets, Circle Paymaster for gasless transactions, and email-as-payment-address functionality.

### Core Features
- ✅ Passwordless authentication (Web3Auth social login)
- ✅ Smart contract wallets (ERC-4337)
- ✅ Gasless USDC transactions
- ✅ Send USDC to email addresses
- ✅ Multi-network support (Mainnet/Testnet)
- ✅ Comprehensive admin dashboard

### Tech Stack (Backend)
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Redis for caching
- Web3Auth SDK
- Ethers.js v6
- Base blockchain (Ethereum L2)

---

## Design Prompt for Loveable

Use this prompt when instructing Loveable to extend the frontend:

```
I need you to extend the existing Maya payment platform frontend while maintaining the current design system, color scheme, and UI/UX patterns.

PROJECT CONTEXT:
Maya is a cross-border USDC payment platform built on Base blockchain with Web3Auth authentication, ERC-4337 smart accounts, and Circle Paymaster for gasless transactions.

EXISTING DESIGN TO MAINTAIN:
- Keep all current colors, typography, spacing, and component styles
- Maintain the existing navigation structure and layout
- Use the same button styles, form inputs, and card components
- Keep the current responsive breakpoints and mobile design
- Preserve animations and transitions currently in use

NEW FEATURES TO ADD:
[Specify the feature from the list below]

BACKEND API:
- Base URL: http://localhost:5000/api (development)
- All endpoints require JWT authentication (except login/register)
- Use Bearer token in Authorization header
- Responses follow standard format: { success: boolean, data: any }
- Errors: { success: false, error: { code, message, details } }

REQUIREMENTS:
1. Maintain existing design consistency - DO NOT change current styles
2. Add new screens/features that feel native to the existing app
3. Implement proper error handling with user-friendly messages
4. Add loading states for all async operations
5. Include form validation with helpful error messages
6. Ensure mobile responsiveness for all new screens
7. Add proper TypeScript types for all API calls
8. Include optimistic UI updates where appropriate
9. Implement proper accessibility (ARIA labels, keyboard navigation)
10. Add analytics tracking for key user actions

INTEGRATION GUIDELINES:
- Use axios or fetch for API calls with proper error handling
- Store JWT tokens securely (httpOnly cookies preferred, or localStorage with XSS protection)
- Implement token refresh logic for expired tokens
- Add request/response interceptors for auth headers and error handling
- Cache API responses where appropriate (React Query or SWR recommended)

IMPORTANT:
- The goal is to EXTEND the existing design, not replace it
- New features should feel seamless with what's already there
- Match the existing component library and design patterns exactly
- When in doubt about design decisions, favor consistency with existing UI
```

---

## Screens & Features to Implement

### 1. Authentication Screens

#### Login/Register Screen
**Design Considerations:**
- Clean, modern design with Web3Auth social login buttons
- Support for Google, Facebook, Twitter, Apple, Email
- "Powered by Web3Auth" branding
- Loading states during authentication
- Error messages for failed logins

**API Endpoints:**
- `POST /api/auth/register` - New user registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

**Key Features:**
```typescript
// Social login buttons
const socialProviders = [
  { name: 'Google', icon: GoogleIcon, provider: 'google' },
  { name: 'Facebook', icon: FacebookIcon, provider: 'facebook' },
  { name: 'Twitter', icon: TwitterIcon, provider: 'twitter' },
  { name: 'Apple', icon: AppleIcon, provider: 'apple' },
];

// On successful login
const handleLogin = async (provider: string) => {
  // 1. Authenticate with Web3Auth
  const web3AuthResult = await web3auth.login(provider);

  // 2. Send to backend
  const response = await api.post('/auth/login', {
    email: web3AuthResult.email,
    web3AuthToken: web3AuthResult.idToken,
  });

  // 3. Store tokens
  localStorage.setItem('accessToken', response.data.tokens.accessToken);
  localStorage.setItem('refreshToken', response.data.tokens.refreshToken);

  // 4. Redirect to dashboard
  navigate('/dashboard');
};
```

---

### 2. Dashboard Screen

**Design Considerations:**
- Wallet balance prominently displayed (large, bold USDC amount)
- Quick action buttons: Send, Request, Pay by Email
- Recent transactions list (last 5-10)
- Smart account address with copy button
- Network indicator (Mainnet/Testnet badge)

**API Endpoints:**
- `GET /api/users/profile` - User details
- `GET /api/users/balance` - Current USDC balance
- `GET /api/transactions/history?limit=10` - Recent transactions
- `GET /api/wallets/account` - Smart account details

**Component Structure:**
```tsx
<Dashboard>
  <WalletBalance balance="1,250.50" currency="USDC" />
  <QuickActions>
    <ActionButton icon={SendIcon} label="Send" onClick={handleSend} />
    <ActionButton icon={RequestIcon} label="Request" onClick={handleRequest} />
    <ActionButton icon={EmailIcon} label="Pay by Email" onClick={handleEmailPay} />
  </QuickActions>
  <SmartAccountCard
    address="0x742d...f44e"
    network="Base Mainnet"
    isDeployed={true}
  />
  <RecentTransactions transactions={recentTxs} />
</Dashboard>
```

---

### 3. Send USDC Screen

**Design Considerations:**
- Recipient input (address or select from contacts)
- Amount input with USDC symbol
- Balance display ("Available: 1,250.50 USDC")
- Optional note/message field
- Gas cost display ("Gas: FREE" or "Gas: ~0.15 USDC")
- Confirmation modal before sending

**API Endpoints:**
- `GET /api/users/balance` - Check available balance
- `POST /api/transactions/send` - Send USDC

**Form Validation:**
```typescript
const sendFormSchema = z.object({
  recipientAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.string()
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .refine((val) => parseFloat(val) <= balance, 'Insufficient balance'),
  note: z.string().max(200).optional(),
});

const handleSend = async (data: SendFormData) => {
  try {
    setLoading(true);
    const response = await api.post('/transactions/send', data);

    // Show success message
    toast.success(`Sent ${data.amount} USDC to ${shortenAddress(data.recipientAddress)}`);

    // Navigate to transaction details
    navigate(`/transactions/${response.data.id}`);
  } catch (error) {
    handleApiError(error);
  } finally {
    setLoading(false);
  }
};
```

---

### 4. Email Payment Screen

**Design Considerations:**
- Email input with validation
- Amount input
- Personal message field (optional)
- Expiration settings (7, 14, 30 days)
- Preview of email that will be sent
- Success screen with shareable claim link

**API Endpoints:**
- `POST /api/payments/send` - Send payment to email
- `GET /api/payments/sent` - List sent email payments
- `GET /api/payments/received` - List received payments

**User Flow:**
```typescript
// Step 1: Send payment to email
const handleSendToEmail = async (data: EmailPaymentData) => {
  const response = await api.post('/payments/send', {
    recipientEmail: data.email,
    amount: data.amount,
    message: data.message,
    expirationDays: data.expirationDays || 30,
  });

  // Step 2: Show success with claim link
  setClaimUrl(response.data.claimUrl);
  setShowSuccessModal(true);
};

// Success Modal
<SuccessModal>
  <CheckCircleIcon size={64} color="green" />
  <h2>Payment Sent!</h2>
  <p>We've sent an email to {recipientEmail} with instructions to claim ${amount} USDC</p>
  <ClaimLink url={claimUrl} />
  <ShareButtons url={claimUrl} />
</SuccessModal>
```

---

### 5. Claim Email Payment Screen

**Design Considerations:**
- Public page (no auth required initially)
- Display sender's name and amount
- Personal message from sender
- "Claim" button (requires login/signup)
- Expiration countdown
- After claiming: success animation

**API Endpoints:**
- `GET /api/payments/claim/:claimToken` - Get payment details
- `POST /api/payments/claim` - Claim the payment (requires auth)

**Component Flow:**
```tsx
const ClaimPaymentPage = () => {
  const { claimToken } = useParams();
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    // Fetch payment details (public endpoint)
    api.get(`/payments/claim/${claimToken}`)
      .then(res => setPayment(res.data))
      .catch(err => setError('Payment not found or expired'));
  }, [claimToken]);

  const handleClaim = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/claim/${claimToken}`);
      return;
    }

    // Claim payment
    const response = await api.post('/payments/claim', { claimToken });

    // Show success
    toast.success(`Claimed ${payment.amount} USDC!`);
    navigate('/dashboard');
  };

  return (
    <ClaimCard>
      <Avatar name={payment.sender.fullName} />
      <h2>{payment.sender.fullName} sent you</h2>
      <Amount>${payment.amount} USDC</Amount>
      {payment.message && <Message>{payment.message}</Message>}
      <ExpirationCountdown expiresAt={payment.expiresAt} />
      <ClaimButton onClick={handleClaim}>
        Claim {payment.amount} USDC
      </ClaimButton>
    </ClaimCard>
  );
};
```

---

### 6. Transaction History Screen

**Design Considerations:**
- List view with infinite scroll or pagination
- Filter by type (Send, Receive, Email Payment)
- Filter by status (Pending, Completed, Failed)
- Date range picker
- Search by transaction hash or recipient
- Each item shows: amount, type, status, date, recipient/sender

**API Endpoints:**
- `GET /api/transactions/history` - Paginated transaction list
- `GET /api/transactions/:id` - Transaction details

**List Item Component:**
```tsx
<TransactionListItem transaction={tx}>
  <TransactionIcon type={tx.transactionType} status={tx.status} />
  <TransactionInfo>
    <TransactionTitle>
      {tx.transactionType === 'SEND' ? 'Sent to' : 'Received from'}
      {' '}
      {tx.transactionType === 'SEND' ? tx.recipient?.fullName : tx.sender?.fullName}
    </TransactionTitle>
    <TransactionDate>{formatDate(tx.createdAt)}</TransactionDate>
  </TransactionInfo>
  <TransactionAmount positive={tx.transactionType === 'RECEIVE'}>
    {tx.transactionType === 'SEND' ? '-' : '+'}${tx.amount} USDC
  </TransactionAmount>
  <StatusBadge status={tx.status} />
</TransactionListItem>
```

---

### 7. Transaction Details Screen

**Design Considerations:**
- Full transaction information
- Status indicator with progress (Pending → Processing → Completed)
- Transaction hash with block explorer link
- Sender and recipient details
- Amount and gas cost
- Timestamp
- Optional note/message
- Share button, receipt download

**Component Structure:**
```tsx
<TransactionDetails transaction={tx}>
  <StatusHeader status={tx.status} />

  <AmountSection>
    <LargeAmount>${tx.amount} USDC</LargeAmount>
    {tx.gasSponsored && <GasBadge>Gas FREE ⚡</GasBadge>}
  </AmountSection>

  <DetailsGrid>
    <DetailRow label="From" value={tx.sender.fullName} subValue={shortenAddress(tx.from)} />
    <DetailRow label="To" value={tx.recipient.fullName} subValue={shortenAddress(tx.to)} />
    <DetailRow label="Date" value={formatDateTime(tx.createdAt)} />
    <DetailRow label="Status" value={<StatusBadge status={tx.status} />} />
    <DetailRow
      label="Transaction Hash"
      value={
        <ExplorerLink hash={tx.txHash}>
          {shortenHash(tx.txHash)} <ExternalLinkIcon />
        </ExplorerLink>
      }
    />
  </DetailsGrid>

  {tx.note && <NoteSection>{tx.note}</NoteSection>}

  <ActionButtons>
    <ShareButton onClick={handleShare} />
    <DownloadReceiptButton onClick={handleDownload} />
  </ActionButtons>
</TransactionDetails>
```

---

### 8. Profile/Settings Screen

**Design Considerations:**
- User information display
- KYC status indicator
- Transaction limits overview
- Notification preferences toggle
- Smart account details
- Network switcher (Mainnet/Testnet) - dev only
- Logout button

**API Endpoints:**
- `GET /api/users/profile` - User profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/limits` - Transaction limits

**Sections:**
```tsx
<SettingsScreen>
  <ProfileSection>
    <Avatar />
    <UserInfo>
      <FullName>{user.fullName}</FullName>
      <Email>{user.email}</Email>
    </UserInfo>
    <EditButton onClick={handleEditProfile} />
  </ProfileSection>

  <KYCSection>
    <KYCStatus status={user.kycStatus} tier={user.kycTier} />
    <UpgradeButton>Upgrade KYC Tier</UpgradeButton>
  </KYCSection>

  <LimitsSection>
    <LimitCard
      label="Daily Limit"
      used={limits.dailyUsed}
      total={limits.dailyLimit}
      resetDate={limits.resetDate.daily}
    />
    <LimitCard
      label="Monthly Limit"
      used={limits.monthlyUsed}
      total={limits.monthlyLimit}
      resetDate={limits.resetDate.monthly}
    />
  </LimitsSection>

  <NotificationPreferences>
    <ToggleRow
      label="Email Notifications"
      enabled={preferences.email}
      onChange={handleToggleEmail}
    />
    <ToggleRow
      label="SMS Notifications"
      enabled={preferences.sms}
      onChange={handleToggleSMS}
    />
    <ToggleRow
      label="Push Notifications"
      enabled={preferences.push}
      onChange={handleTogglePush}
    />
  </NotificationPreferences>

  <SmartAccountSection>
    <AddressDisplay address={smartAccount.accountAddress} />
    <CopyButton />
    <QRCodeButton />
  </SmartAccountSection>

  <DangerZone>
    <LogoutButton onClick={handleLogout} />
  </DangerZone>
</SettingsScreen>
```

---

### 9. Admin Dashboard (Admin Only)

**Design Considerations:**
- Separate admin interface with different color scheme
- Login with 2FA
- Overview metrics dashboard
- User management table
- Transaction monitoring
- Analytics charts
- Permission-based feature access

**API Endpoints:**
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/dashboard/overview` - Dashboard metrics
- `GET /api/admin/users` - User list with filters
- `GET /api/admin/transactions` - Transaction list
- `GET /api/admin/dashboard/volume` - Volume charts
- `GET /api/admin/dashboard/users/growth` - User growth

**Admin Dashboard Structure:**
```tsx
<AdminDashboard>
  <AdminHeader>
    <Logo />
    <AdminNav>
      <NavItem icon={DashboardIcon} label="Overview" />
      <NavItem icon={UsersIcon} label="Users" />
      <NavItem icon={TransactionsIcon} label="Transactions" />
      <NavItem icon={AnalyticsIcon} label="Analytics" />
      <NavItem icon={SettingsIcon} label="Settings" />
    </AdminNav>
    <AdminProfile />
  </AdminHeader>

  <OverviewMetrics>
    <MetricCard
      title="Total Users"
      value="5,420"
      change="+2.5%"
      icon={UsersIcon}
    />
    <MetricCard
      title="Total Transactions"
      value="48,750"
      change="+5.2%"
      icon={TransactionsIcon}
    />
    <MetricCard
      title="Total Volume"
      value="$2,847,563"
      change="+8.3%"
      icon={DollarIcon}
    />
    <MetricCard
      title="Active Today"
      value="342"
      change="+12.1%"
      icon={ActivityIcon}
    />
  </OverviewMetrics>

  <ChartsSection>
    <VolumeChart data={volumeData} />
    <UserGrowthChart data={userGrowthData} />
  </ChartsSection>

  <RecentActivity>
    <ActivityList />
  </RecentActivity>
</AdminDashboard>
```

---

### 10. Admin User Management Screen

**Design Considerations:**
- Searchable/filterable user table
- User details modal
- Suspend/unsuspend actions
- KYC status management
- Transaction limits editing
- Admin notes

**User Management Table:**
```tsx
<UserManagementTable>
  <TableFilters>
    <SearchInput placeholder="Search by email or name..." />
    <FilterDropdown label="KYC Status" options={kycStatuses} />
    <FilterDropdown label="Status" options={['Active', 'Suspended']} />
  </TableFilters>

  <Table>
    <TableHeader>
      <Column>User</Column>
      <Column>KYC Status</Column>
      <Column>Balance</Column>
      <Column>Transactions</Column>
      <Column>Joined</Column>
      <Column>Actions</Column>
    </TableHeader>
    <TableBody>
      {users.map(user => (
        <UserRow key={user.id}>
          <UserCell>
            <Avatar src={user.avatar} />
            <div>
              <UserName>{user.fullName}</UserName>
              <UserEmail>{user.email}</UserEmail>
            </div>
          </UserCell>
          <KYCBadge status={user.kycStatus} tier={user.kycTier} />
          <Amount>${user.balance}</Amount>
          <Count>{user.transactionCount}</Count>
          <Date>{formatDate(user.createdAt)}</Date>
          <ActionMenu>
            <MenuItem onClick={() => handleViewUser(user.id)}>View Details</MenuItem>
            <MenuItem onClick={() => handleSuspend(user.id)}>Suspend</MenuItem>
            <MenuItem onClick={() => handleEditLimits(user.id)}>Edit Limits</MenuItem>
          </ActionMenu>
        </UserRow>
      ))}
    </TableBody>
  </Table>

  <Pagination
    page={page}
    totalPages={totalPages}
    onPageChange={setPage}
  />
</UserManagementTable>
```

---

## API Integration Guidelines

### 1. Setting Up API Client

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
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

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 2. Type-Safe API Calls

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

// src/services/transactionService.ts
import api from '@/lib/api';
import type { Transaction, ApiResponse } from '@/types';

export const transactionService = {
  async send(data: SendTransactionData): Promise<Transaction> {
    const response = await api.post<ApiResponse<Transaction>>(
      '/transactions/send',
      data
    );
    return response.data.data;
  },

  async getHistory(params: HistoryParams): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get<ApiResponse<PaginatedResponse<Transaction>>>(
      '/transactions/history',
      { params }
    );
    return response.data.data;
  },

  async getById(id: string): Promise<Transaction> {
    const response = await api.get<ApiResponse<Transaction>>(
      `/transactions/${id}`
    );
    return response.data.data;
  },
};
```

### 3. React Query Integration (Recommended)

```typescript
// src/hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';

export const useTransactions = (params: HistoryParams) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionService.getHistory(params),
    staleTime: 30000, // 30 seconds
  });
};

export const useSendTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transactionService.send,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
};

// Usage in component
const TransactionHistory = () => {
  const [params, setParams] = useState({ page: 1, limit: 20 });
  const { data, isLoading, error } = useTransactions(params);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <TransactionList
      transactions={data.transactions}
      pagination={data.pagination}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};
```

---

## State Management

### Recommended Approach: React Query + Zustand

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: Tokens, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (tokens, user) => set({
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
      }),

      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'maya-auth',
    }
  )
);
```

---

## Authentication Flow

### Complete Auth Implementation

```typescript
// src/hooks/useAuth.ts
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const handleWeb3AuthLogin = async (provider: string) => {
    try {
      // 1. Initialize Web3Auth
      const web3auth = new Web3Auth({
        clientId: process.env.REACT_APP_WEB3AUTH_CLIENT_ID!,
        chainConfig: {
          chainNamespace: 'eip155',
          chainId: '0x2105', // Base mainnet
        },
      });

      await web3auth.initModal();

      // 2. Connect with provider
      const web3authProvider = await web3auth.connectTo(
        WALLET_ADAPTERS.OPENLOGIN,
        {
          loginProvider: provider,
        }
      );

      // 3. Get user info
      const userInfo = await web3auth.getUserInfo();

      // 4. Get ID token
      const idToken = await web3authProvider.request({
        method: 'eth_getIdToken',
      });

      // 5. Send to backend
      const response = await authService.login({
        email: userInfo.email,
        web3AuthToken: idToken,
      });

      // 6. Store in state
      login(response.tokens, response.user);

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    logout();
  };

  return {
    user,
    isAuthenticated,
    login: handleWeb3AuthLogin,
    logout: handleLogout,
  };
};
```

### Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// src/router.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/claim/:token" element={<ClaimPaymentPage />} />

  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/send" element={<SendPage />} />
    <Route path="/transactions" element={<TransactionsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Route>
</Routes>
```

---

## Error Handling

### Centralized Error Handler

```typescript
// src/utils/errorHandler.ts
import { toast } from 'sonner';
import type { ApiError } from '@/types';

export const handleApiError = (error: any) => {
  if (error.response?.data?.error) {
    const apiError: ApiError['error'] = error.response.data.error;

    // Handle specific error codes
    switch (apiError.code) {
      case 'VALIDATION_ERROR':
        // Show field-specific errors
        if (apiError.details) {
          Object.entries(apiError.details).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`);
          });
        } else {
          toast.error(apiError.message);
        }
        break;

      case 'UNAUTHORIZED':
        toast.error('Please log in to continue');
        // Redirect to login
        window.location.href = '/login';
        break;

      case 'FORBIDDEN':
        toast.error('You do not have permission to perform this action');
        break;

      case 'NOT_FOUND':
        toast.error('Resource not found');
        break;

      case 'RATE_LIMIT_EXCEEDED':
        toast.error('Too many requests. Please try again later.');
        break;

      default:
        toast.error(apiError.message || 'An error occurred');
    }
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Unknown error
    toast.error('An unexpected error occurred');
  }
};

// Usage in components
const handleSend = async (data: SendData) => {
  try {
    await transactionService.send(data);
    toast.success('Transaction sent successfully!');
  } catch (error) {
    handleApiError(error);
  }
};
```

---

## Testing Checklist

### Frontend Testing

- [ ] All API endpoints return expected data formats
- [ ] Authentication flow works end-to-end
- [ ] Token refresh works correctly
- [ ] Protected routes redirect to login when not authenticated
- [ ] Form validation shows appropriate error messages
- [ ] Loading states appear during API calls
- [ ] Error messages are user-friendly
- [ ] Mobile responsive design works on all screens
- [ ] All buttons and links work correctly
- [ ] Transaction flow works from send to confirmation
- [ ] Email payment flow works from send to claim
- [ ] Admin dashboard loads with correct permissions
- [ ] Admin actions (suspend, flag, etc.) work correctly

### Integration Testing Scenarios

1. **New User Registration**
   - Click social login button
   - Complete Web3Auth flow
   - Verify user created in backend
   - Verify smart account created
   - Verify JWT tokens stored

2. **Send Transaction**
   - Enter recipient address
   - Enter amount
   - Verify balance check
   - Submit transaction
   - Verify transaction appears in history
   - Verify balance updated

3. **Email Payment Flow**
   - Send payment to email
   - Receive claim link
   - Open claim page (logged out)
   - Login/register
   - Claim payment
   - Verify balance updated

4. **Admin Operations**
   - Admin login with 2FA
   - View dashboard metrics
   - Search for user
   - Suspend user
   - Verify user cannot transact
   - Unsuspend user

---

## Quick Start Code Snippets

### Example: Send Transaction Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSendTransaction } from '@/hooks/useTransactions';
import { useBalance } from '@/hooks/useBalance';
import { handleApiError } from '@/utils/errorHandler';

const sendSchema = z.object({
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address'),
  amount: z.string().refine((val) => parseFloat(val) > 0, 'Amount must be > 0'),
  note: z.string().max(200).optional(),
});

type SendFormData = z.infer<typeof sendSchema>;

export const SendForm = () => {
  const { data: balance } = useBalance();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const { register, handleSubmit, formState: { errors } } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
  });

  const onSubmit = (data: SendFormData) => {
    sendTransaction(data, {
      onSuccess: (tx) => {
        toast.success(`Sent ${data.amount} USDC!`);
        navigate(`/transactions/${tx.id}`);
      },
      onError: handleApiError,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('recipientAddress')}
        label="Recipient Address"
        placeholder="0x..."
        error={errors.recipientAddress?.message}
      />

      <Input
        {...register('amount')}
        label="Amount"
        type="number"
        step="0.01"
        placeholder="0.00"
        suffix="USDC"
        error={errors.amount?.message}
        hint={`Available: ${balance} USDC`}
      />

      <Textarea
        {...register('note')}
        label="Note (Optional)"
        placeholder="What's this for?"
        error={errors.note?.message}
      />

      <Button
        type="submit"
        isLoading={isPending}
        disabled={!balance || parseFloat(balance) === 0}
      >
        Send {watch('amount')} USDC
      </Button>
    </form>
  );
};
```

---

## Additional Resources

- **Web3Auth Documentation**: https://web3auth.io/docs
- **Base Network**: https://docs.base.org
- **ERC-4337 Account Abstraction**: https://eips.ethereum.org/EIPS/eip-4337
- **Circle USDC**: https://developers.circle.com

---

## Support

For questions or issues during integration:
- Backend API Documentation: See `BACKEND_API_DOCUMENTATION.md`
- Postman Collection: See `POSTMAN_COLLECTION.md`
- Backend Developer: [Your Contact Info]

---

**Last Updated:** January 9, 2025
