# Maya Payment Hub - Backend API

A production-ready RESTful API backend for Maya, a revolutionary cross-border USDC payment platform with **email-as-payment-address** functionality, **Web3Auth embedded wallets**, and **gasless transactions via Circle Paymaster**.

## 🌟 Key Features

- **Passwordless Authentication**: Web3Auth integration with social login and email magic links
- **Embedded Wallets**: Non-custodial smart contract wallets (ERC-4337) automatically created for users
- **Gasless Transactions**: Users pay gas fees in USDC instead of ETH via Circle Paymaster
- **Email Payments**: Send USDC to anyone using just their email address
- **Base Blockchain**: All transactions on Base (Ethereum L2) for fast, low-cost settlements
- **Comprehensive Admin Dashboard**: Full admin panel for user management, KYC, transactions, and analytics

## 🏗️ Architecture

### Technology Stack

#### Authentication & Wallet Management
- **Web3Auth SDK**: Passwordless authentication with embedded wallet creation
  - Social login (Google, Facebook, Twitter, Apple)
  - Email passwordless (magic link)
  - SMS OTP authentication
  - Automatic non-custodial wallet generation
  - MPC (Multi-Party Computation) key management

#### Blockchain & Gas Management
- **Network**: Base (Ethereum L2 - Coinbase's Layer 2)
- **Web3 Library**: ethers.js v6
- **USDC Contract**: Base USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **Circle Paymaster**: Gasless transactions with USDC gas payments
- **ERC-4337 Account Abstraction**: Smart Contract Accounts for all users

#### Core Backend
- **Runtime**: Node.js 20+ LTS
- **Framework**: Express.js 4.18+
- **Language**: TypeScript 5+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Queue**: Bull (Redis-based job queue)

## 📁 Project Structure

```
maya-backend/
├── src/
│   ├── config/          # Configuration files (database, redis, blockchain, web3auth, paymaster)
│   ├── contracts/       # Smart contract ABIs and addresses
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic layer
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── jobs/            # Background jobs
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Unit, integration, and e2e tests
├── .env.example         # Environment variables template
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+
- Web3Auth Account (get client ID from dashboard)
- Circle API Account (for Paymaster)
- Alchemy or QuickNode Account (for Base RPC)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd maya-pay-hub
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:
- Database URL
- Redis URL
- Web3Auth credentials
- Circle API keys
- Base RPC endpoints
- Other service credentials

4. **Set up database**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

5. **Start development server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## 🔧 Environment Variables

See `.env.example` for a complete list of required environment variables:

### Essential Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maya_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Web3Auth
WEB3AUTH_CLIENT_ID=your-web3auth-client-id
WEB3AUTH_VERIFIER=maya-auth-verifier
WEB3AUTH_NETWORK=mainnet

# Circle Paymaster
CIRCLE_API_KEY=your-circle-api-key
CIRCLE_PAYMASTER_ADDRESS=0x...

# Base Blockchain
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY

# ERC-4337
ACCOUNT_FACTORY_ADDRESS=0x...
ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
BUNDLER_RPC_URL=https://base-bundler.alchemy.com/v2/YOUR-KEY
```

## 📡 API Endpoints

### Authentication

- `POST /api/auth/login` - Login with Web3Auth
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users (Coming Soon)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/balance` - Get wallet balance

### Transactions (Coming Soon)
- `POST /api/transactions/send` - Send USDC
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/:id` - Get transaction details

### Email Payments (Coming Soon)
- `POST /api/payments/email` - Send payment to email
- `POST /api/payments/:id/claim` - Claim email payment
- `GET /api/payments/pending` - Get pending payments

## 🏦 Database Schema

The database includes comprehensive models for:

- **Users**: User profiles with Web3Auth integration
- **SmartAccounts**: ERC-4337 smart contract wallets
- **UserOperations**: Account abstraction operations
- **Web3AuthSessions**: Web3Auth session management
- **Transactions**: USDC transactions with gas tracking
- **EmailPayments**: Email-based payment escrows
- **GasSponsorship**: Paymaster sponsorship tracking
- **PaymasterMetrics**: Gas usage analytics
- **And many more...**

See `prisma/schema.prisma` for complete schema.

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Web3Auth Sessions**: Distributed session management
- **Rate Limiting**: Protection against abuse
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing controls
- **Input Validation**: Comprehensive request validation
- **Encryption**: AES-256 for sensitive data

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📝 Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Lint code
npm run format      # Format code with Prettier
```

## 🔄 Development Workflow

1. **Web3Auth Integration**: Users authenticate via social login or email
2. **Smart Account Creation**: System automatically creates ERC-4337 smart account
3. **Gasless Transactions**: Circle Paymaster sponsors gas or converts USDC to gas
4. **Email Payments**: Send USDC to email addresses with escrow
5. **Auto-Claim**: Recipients auto-claim funds when they register

## 🚧 Current Implementation Status

### ✅ Completed

**Core Infrastructure:**
- Project structure and configuration
- TypeScript setup
- Prisma database schema with 30+ models
- Configuration system (database, Redis, blockchain, Web3Auth, Paymaster)
- Contract ABIs (USDC, Smart Accounts, Paymaster, EntryPoint)
- Utility functions (logger, errors, validators, helpers, constants)

**Services Layer:**
- ✅ **Web3Auth Service**: Passwordless authentication, session management
- ✅ **Smart Account Service**: ERC-4337 wallet creation, nonce management, deployment
- ✅ **Paymaster Service**: Gasless transactions, gas sponsorship, metrics tracking
- ✅ **Blockchain Service**: USDC transfers, UserOperation creation, gas estimation
- ✅ **Transaction Service**: Send/receive, history, statistics, cancellation
- ✅ **Email Payment Service**: Send to email, claim payments, escrow management
- ✅ **User Service**: Profile management, balance, limits, notifications
- ✅ **Email Service**: SendGrid integration with Handlebars templates

**Controllers & Routes:**
- ✅ **Auth Controller**: Login, refresh, logout, current user (`/api/auth/*`)
- ✅ **User Controller**: Profile, balance, summary, notifications (`/api/users/*`)
- ✅ **Wallet Controller**: Wallet details, balance, gas prices (`/api/wallets/*`)
- ✅ **Transaction Controller**: Send, history, stats, cancel (`/api/transactions/*`)
- ✅ **Email Payment Controller**: Send, claim, cancel, track (`/api/payments/*`)

**Middleware:**
- ✅ Error handling middleware with AppError support
- ✅ Authentication middleware (JWT + Web3Auth sessions)
- ✅ Validation middleware for requests
- ✅ Rate limiting and security headers

**Email Templates:**
- ✅ Welcome email with wallet address
- ✅ Payment waiting notification
- ✅ Payment claimed notification

**Express Application:**
- ✅ Server setup with database, Redis, blockchain initialization
- ✅ Health check endpoint
- ✅ Comprehensive error handling
- ✅ CORS and security configuration

### 🚧 In Progress / Todo

- Background jobs (blockchain monitoring, email sending, claim reminders)
- Additional email templates (reminders, refunds, transaction confirmations)
- Admin dashboard controllers and routes
- Escrow management endpoints
- KYC integration
- Bank and card integration endpoints
- Comprehensive testing suite
- API documentation (Swagger/OpenAPI)
- Docker configuration
- CI/CD pipelines
- Production deployment guides

## 📚 Additional Documentation

- [Web3Auth Integration Guide](docs/web3auth-integration.md) - Coming soon
- [Paymaster Guide](docs/paymaster-guide.md) - Coming soon
- [Admin API](docs/admin-api.md) - Coming soon
- [User API](docs/user-api.md) - Coming soon

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Web3Auth](https://web3auth.io/) for embedded wallet infrastructure
- [Circle](https://circle.com/) for USDC and Paymaster support
- [Base](https://base.org/) for fast and low-cost L2 transactions
- [Coinbase](https://coinbase.com/) for Base blockchain infrastructure

## 📧 Support

For support and questions:
- Email: support@maya-pay.com
- Documentation: https://docs.maya-pay.com

---

**Built with ❤️ for seamless cross-border payments**
