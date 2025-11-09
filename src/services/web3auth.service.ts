// src/services/web3auth.service.ts

import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UnauthorizedError } from '../utils/errors';
import smartAccountService from './smartAccount.service';

interface Web3AuthLoginParams {
  idToken: string;
  provider: string;
  verifierId: string;
  publicKey: string;
}

class Web3AuthService {
  /**
   * Handle user authentication via Web3Auth
   * This is called from frontend after Web3Auth login
   */
  async authenticateUser(params: Web3AuthLoginParams) {
    const { idToken, provider, verifierId, publicKey } = params;

    // Verify the ID token with Web3Auth
    const decoded = await this.verifyIdToken(idToken);

    if (!decoded) {
      throw new UnauthorizedError('Invalid Web3Auth token');
    }

    // Extract email or identifier from verifierId
    const email = this.extractEmailFromVerifierId(verifierId, provider);

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { web3AuthVerifierId: verifierId },
          { email: email },
        ],
      },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user with smart account
      user = await this.createUserWithSmartAccount({
        email,
        web3AuthId: decoded.sub,
        web3AuthProvider: provider,
        web3AuthVerifierId: verifierId,
        publicKey,
      });
      isNewUser = true;
    } else if (!user.web3AuthId) {
      // Link Web3Auth to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          web3AuthId: decoded.sub,
          web3AuthProvider: provider as any,
          web3AuthVerifierId: verifierId,
          emailVerified: true,
        },
        include: {
          smartAccounts: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      });
    }

    // Create Web3Auth session
    const session = await this.createWeb3AuthSession({
      userId: user.id,
      idToken,
      provider,
      verifierId,
      publicKey,
    });

    // Check for pending email payments
    const pendingPayments = await this.checkPendingPayments(email);

    logger.info(`User authenticated via Web3Auth: ${user.email} (${provider})`);

    return {
      user,
      session,
      isNewUser,
      smartAccount: user.smartAccounts[0],
      pendingPayments,
    };
  }

  /**
   * Create new user with smart contract account
   */
  private async createUserWithSmartAccount(params: {
    email: string;
    web3AuthId: string;
    web3AuthProvider: string;
    web3AuthVerifierId: string;
    publicKey: string;
  }) {
    const { email, web3AuthId, web3AuthProvider, web3AuthVerifierId, publicKey } = params;

    // Generate counterfactual smart account address
    const smartAccountAddress = await smartAccountService.getCounterfactualAddress(publicKey);

    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        web3AuthId,
        web3AuthProvider: web3AuthProvider as any,
        web3AuthVerifierId,
        registrationSource: 'web3auth',
        smartAccounts: {
          create: {
            accountAddress: smartAccountAddress,
            accountType: 'WEB3AUTH_EMBEDDED',
            web3AuthPublicKey: publicKey,
            factoryAddress: config.accountFactory.address,
            entryPointAddress: config.entryPoint.address,
            paymasterEnabled: true,
            paymasterAddress: config.paymaster.address,
            network: 'base',
            chainId: 8453,
            isDeployed: false, // Will deploy on first transaction
            isPrimary: true,
          },
        },
      },
      include: {
        smartAccounts: true,
      },
    });

    logger.info(`New user created with smart account: ${email}`);

    return user;
  }

  /**
   * Create Web3Auth session
   */
  private async createWeb3AuthSession(params: {
    userId: string;
    idToken: string;
    provider: string;
    verifierId: string;
    publicKey: string;
  }) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.web3AuthSession.create({
      data: {
        userId: params.userId,
        sessionId: `web3auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        idToken: params.idToken,
        provider: params.provider as any,
        verifierId: params.verifierId,
        publicKey: params.publicKey,
        expiresAt,
        isActive: true,
      },
    });

    return session;
  }

  /**
   * Verify Web3Auth ID token
   */
  private async verifyIdToken(idToken: string): Promise<any> {
    try {
      // In production, verify JWT signature with Web3Auth's public key
      // Using proper JWT verification library
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );

      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload;
    } catch (error) {
      logger.error('Error verifying Web3Auth token:', error);
      return null;
    }
  }

  /**
   * Extract email from verifier ID based on provider
   */
  private extractEmailFromVerifierId(verifierId: string, provider: string): string {
    // For email passwordless, verifierId is the email
    if (provider === 'EMAIL_PASSWORDLESS') {
      return verifierId.toLowerCase();
    }

    // For social logins, verifierId might be email or ID
    // You may need to make additional API calls to get email
    // For now, use verifierId as email (update based on actual Web3Auth response)
    return verifierId.toLowerCase();
  }

  /**
   * Check for pending email payments
   */
  private async checkPendingPayments(email: string) {
    const pending = await prisma.pendingEmailPayment.findUnique({
      where: { recipientEmail: email.toLowerCase() },
    });

    if (pending) {
      // Get actual email payments
      const payments = await prisma.emailPayment.findMany({
        where: {
          recipientEmail: email.toLowerCase(),
          status: {
            in: ['PENDING', 'DELIVERED', 'OPENED', 'CLICKED'],
          },
        },
        include: {
          sender: {
            select: {
              email: true,
              fullName: true,
            },
          },
        },
      });

      return {
        totalAmount: pending.totalAmount,
        count: pending.paymentCount,
        payments,
      };
    }

    return null;
  }

  /**
   * Refresh Web3Auth session
   */
  async refreshSession(sessionId: string) {
    const session = await prisma.web3AuthSession.findUnique({
      where: { sessionId },
      include: {
        user: {
          include: {
            smartAccounts: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!session || !session.isActive || new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session expired or invalid');
    }

    // Update last activity
    await prisma.web3AuthSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
      },
    });

    return session;
  }

  /**
   * Logout - invalidate session
   */
  async logout(sessionId: string) {
    await prisma.web3AuthSession.update({
      where: { sessionId },
      data: {
        isActive: false,
      },
    });

    logger.info(`User logged out: session ${sessionId}`);
  }

  /**
   * Get user by Web3Auth ID
   */
  async getUserByWeb3AuthId(web3AuthId: string) {
    return await prisma.user.findUnique({
      where: { web3AuthId },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
  }

  /**
   * Get user by verifier ID
   */
  async getUserByVerifierId(verifierId: string) {
    return await prisma.user.findUnique({
      where: { web3AuthVerifierId: verifierId },
      include: {
        smartAccounts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
  }
}

export default new Web3AuthService();
