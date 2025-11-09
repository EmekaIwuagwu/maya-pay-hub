// src/services/paymaster.service.ts

import { ethers } from 'ethers';
import axios from 'axios';
import { prisma } from '../config/database';
import { config } from '../config';
import { getProvider, getGasPrices } from '../config/blockchain';
import { logger } from '../utils/logger';
import { BlockchainError } from '../utils/errors';

interface UserOperationParams {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

interface PaymasterResponse {
  paymasterAndData: string;
  preVerificationGas: bigint;
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

class PaymasterService {
  private provider: ethers.JsonRpcProvider;
  private paymasterAddress: string;
  private circleApiKey: string;
  private circleApiUrl: string;

  constructor() {
    this.provider = getProvider();
    this.paymasterAddress = config.paymaster.address;
    this.circleApiKey = config.circle.apiKey;
    this.circleApiUrl = config.circle.apiBaseUrl;
  }

  /**
   * Get paymaster data for UserOperation
   * This allows users to pay gas in USDC
   */
  async getPaymasterData(
    userOp: UserOperationParams,
    userId?: string
  ): Promise<PaymasterResponse> {
    try {
      // Check if user is eligible for gas sponsorship
      const shouldSponsor = await this.shouldSponsorGas(userId);

      if (!config.paymaster.enabled) {
        logger.warn('Paymaster is disabled');
        return this.createEmptyPaymasterResponse(userOp);
      }

      // In production, call Circle Paymaster API
      // For now, return mock data structure
      const paymasterData = await this.callCirclePaymaster(userOp, shouldSponsor, userId);

      return {
        paymasterAndData: paymasterData.paymasterAndData,
        preVerificationGas: BigInt(paymasterData.preVerificationGas),
        verificationGasLimit: BigInt(paymasterData.verificationGasLimit),
        callGasLimit: BigInt(paymasterData.callGasLimit),
        maxFeePerGas: BigInt(paymasterData.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(paymasterData.maxPriorityFeePerGas),
      };
    } catch (error) {
      logger.error('Error getting paymaster data:', error);
      // Fallback to no paymaster
      return this.createEmptyPaymasterResponse(userOp);
    }
  }

  /**
   * Call Circle Paymaster API
   */
  private async callCirclePaymaster(
    userOp: UserOperationParams,
    shouldSponsor: boolean,
    userId?: string
  ): Promise<any> {
    try {
      // This is a placeholder for actual Circle Paymaster API call
      // Update with actual Circle API endpoint when available

      const response = await axios.post(
        `${this.circleApiUrl}/paymaster/sponsor`,
        {
          userOperation: {
            sender: userOp.sender,
            nonce: userOp.nonce.toString(),
            initCode: userOp.initCode,
            callData: userOp.callData,
            callGasLimit: userOp.callGasLimit.toString(),
            verificationGasLimit: userOp.verificationGasLimit.toString(),
            preVerificationGas: userOp.preVerificationGas.toString(),
            maxFeePerGas: userOp.maxFeePerGas.toString(),
            maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
          },
          sponsor: shouldSponsor,
          context: {
            userId,
            timestamp: Date.now(),
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.circleApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Circle Paymaster API error:', error.response?.data || error.message);

      // Return mock paymaster data for development
      return {
        paymasterAndData: this.paymasterAddress,
        preVerificationGas: userOp.preVerificationGas.toString(),
        verificationGasLimit: userOp.verificationGasLimit.toString(),
        callGasLimit: userOp.callGasLimit.toString(),
        maxFeePerGas: userOp.maxFeePerGas.toString(),
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
      };
    }
  }

  /**
   * Create empty paymaster response (no sponsorship)
   */
  private createEmptyPaymasterResponse(userOp: UserOperationParams): PaymasterResponse {
    return {
      paymasterAndData: '0x',
      preVerificationGas: userOp.preVerificationGas,
      verificationGasLimit: userOp.verificationGasLimit,
      callGasLimit: userOp.callGasLimit,
      maxFeePerGas: userOp.maxFeePerGas,
      maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
    };
  }

  /**
   * Estimate gas costs in USDC
   */
  async estimateGasCostUSDC(userOp: UserOperationParams): Promise<{
    gasEstimate: bigint;
    gasCostETH: string;
    gasCostUSDC: string;
  }> {
    // Estimate total gas
    const totalGas = userOp.callGasLimit +
      userOp.verificationGasLimit +
      userOp.preVerificationGas;

    // Get current gas price
    const { maxFeePerGas } = await getGasPrices();
    const gasPrice = maxFeePerGas;

    // Calculate cost in ETH
    const gasCostWei = totalGas * gasPrice;
    const gasCostETH = ethers.formatEther(gasCostWei);

    // Get ETH/USD price
    const ethPrice = await this.getETHPrice();

    // Get USDC/USD price (should be ~1.00)
    const usdcPrice = 1.0;

    // Calculate USDC cost
    const gasCostUSD = parseFloat(gasCostETH) * ethPrice;
    const gasCostUSDC = (gasCostUSD / usdcPrice).toFixed(6);

    return {
      gasEstimate: totalGas,
      gasCostETH,
      gasCostUSDC,
    };
  }

  /**
   * Check if user should receive sponsored gas
   */
  private async shouldSponsorGas(userId?: string): Promise<boolean> {
    if (!userId || !config.paymaster.sponsorNewUsers) {
      return false;
    }

    // Check if user has been sponsored before
    const sponsorshipCount = await prisma.gasSponsorship.count({
      where: { userId },
    });

    // Sponsor first N transactions for new users
    const shouldSponsor = sponsorshipCount < config.paymaster.sponsorLimitPerUser;

    logger.info(`Gas sponsorship for user ${userId}: ${shouldSponsor} (count: ${sponsorshipCount})`);

    return shouldSponsor;
  }

  /**
   * Record gas sponsorship
   */
  async recordGasSponsorship(params: {
    userId?: string;
    transactionId?: string;
    userOpHash: string;
    transactionHash?: string;
    gasAmountUSDC: string;
    gasAmountETH: string;
    reason: string;
    campaignId?: string;
  }) {
    await prisma.gasSponsorship.create({
      data: {
        userId: params.userId,
        transactionId: params.transactionId,
        userOpHash: params.userOpHash,
        transactionHash: params.transactionHash,
        gasAmountUSDC: params.gasAmountUSDC,
        gasAmountETH: params.gasAmountETH,
        paymasterAddress: this.paymasterAddress,
        reason: params.reason,
        campaignId: params.campaignId,
      },
    });

    logger.info(`Gas sponsorship recorded: ${params.reason} (${params.gasAmountUSDC} USDC)`);
  }

  /**
   * Get ETH price from oracle/API
   */
  private async getETHPrice(): Promise<number> {
    try {
      // In production, use Chainlink or CoinGecko API
      // For now, return mock price
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      return response.data.ethereum.usd;
    } catch (error) {
      logger.warn('Failed to fetch ETH price, using default');
      return 2000; // Default fallback
    }
  }

  /**
   * Track paymaster metrics
   */
  async trackPaymasterMetrics(params: {
    successful: boolean;
    gasUSDC: string;
    gasETH: string;
    sponsored: boolean;
  }) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hour = now.getHours();

    try {
      // Update or create metrics record
      await prisma.paymasterMetrics.upsert({
        where: {
          date_hour: {
            date,
            hour,
          },
        },
        update: {
          totalOperations: { increment: 1 },
          successfulOps: { increment: params.successful ? 1 : 0 },
          failedOps: { increment: params.successful ? 0 : 1 },
          totalGasUSDC: { increment: params.gasUSDC },
          totalGasETH: { increment: params.gasETH },
          sponsoredOps: { increment: params.sponsored ? 1 : 0 },
          sponsoredGasUSDC: { increment: params.sponsored ? params.gasUSDC : 0 },
        },
        create: {
          date,
          hour,
          totalOperations: 1,
          successfulOps: params.successful ? 1 : 0,
          failedOps: params.successful ? 0 : 1,
          totalGasUSDC: params.gasUSDC,
          totalGasETH: params.gasETH,
          sponsoredOps: params.sponsored ? 1 : 0,
          sponsoredGasUSDC: params.sponsored ? params.gasUSDC : 0,
        },
      });
    } catch (error) {
      logger.error('Error tracking paymaster metrics:', error);
    }
  }

  /**
   * Get paymaster metrics for date range
   */
  async getPaymasterMetrics(startDate: Date, endDate: Date) {
    return await prisma.paymasterMetrics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Calculate average gas cost
   */
  async getAverageGasCost(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.getPaymasterMetrics(startDate, new Date());

    if (metrics.length === 0) {
      return {
        averageUSDC: '0',
        averageETH: '0',
        totalOperations: 0,
      };
    }

    const totalOps = metrics.reduce((sum, m) => sum + m.totalOperations, 0);
    const totalUSDC = metrics.reduce((sum, m) => sum + parseFloat(m.totalGasUSDC.toString()), 0);
    const totalETH = metrics.reduce((sum, m) => sum + parseFloat(m.totalGasETH.toString()), 0);

    return {
      averageUSDC: (totalUSDC / totalOps).toFixed(6),
      averageETH: (totalETH / totalOps).toFixed(18),
      totalOperations: totalOps,
    };
  }
}

export default new PaymasterService();
