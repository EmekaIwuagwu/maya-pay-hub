// src/services/blockchain.service.ts

import { ethers } from 'ethers';
import { prisma } from '../config/database';
import { config } from '../config';
import { getProvider, formatUSDC, parseUSDC, waitForTransaction } from '../config/blockchain';
import { logger } from '../utils/logger';
import { BlockchainError, ValidationError } from '../utils/errors';
import smartAccountService from './smartAccount.service';
import paymasterService from './paymaster.service';

// Import ABIs
import USDCABI from '../contracts/abis/USDC.json';
import SmartAccountABI from '../contracts/abis/SmartAccount.json';
import EntryPointABI from '../contracts/abis/EntryPoint.json';

interface SendUSDCParams {
  fromSmartAccountId: string;
  toAddress: string;
  amount: string; // USDC amount as string
  userId: string;
}

interface UserOperationResult {
  userOpHash: string;
  userOperation: any;
  paymasterUsed: boolean;
  estimatedGasUSDC: string;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private entryPoint: ethers.Contract;

  constructor() {
    this.provider = getProvider();
    this.usdcContract = new ethers.Contract(
      config.circle.usdcContract,
      USDCABI,
      this.provider
    );
    this.entryPoint = new ethers.Contract(
      config.entryPoint.address,
      EntryPointABI,
      this.provider
    );
  }

  /**
   * Send USDC with gasless transaction (UserOperation)
   */
  async sendUSDC(params: SendUSDCParams): Promise<UserOperationResult> {
    const { fromSmartAccountId, toAddress, amount, userId } = params;

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      throw new ValidationError('Invalid recipient address');
    }

    // Get smart account
    const smartAccount = await prisma.smartAccount.findUnique({
      where: { id: fromSmartAccountId },
    });

    if (!smartAccount) {
      throw new BlockchainError('Smart account not found');
    }

    // Check balance
    const balance = await this.getUSDCBalance(smartAccount.accountAddress);
    const amountBigInt = parseUSDC(amount);

    if (BigInt(balance) < amountBigInt) {
      throw new ValidationError('Insufficient USDC balance');
    }

    // Create UserOperation for USDC transfer
    const userOp = await this.createTransferUserOp(
      smartAccount,
      toAddress,
      amount,
      userId
    );

    logger.info(`UserOperation created: ${userOp.userOpHash}`);

    return userOp;
  }

  /**
   * Create UserOperation for USDC transfer
   */
  private async createTransferUserOp(
    smartAccount: any,
    toAddress: string,
    amount: string,
    userId: string
  ): Promise<UserOperationResult> {
    // Encode USDC transfer call data
    const usdcInterface = new ethers.Interface(USDCABI);
    const amountBigInt = parseUSDC(amount);

    const transferCallData = usdcInterface.encodeFunctionData('transfer', [
      toAddress,
      amountBigInt,
    ]);

    // Encode smart account execute call
    const smartAccountInterface = new ethers.Interface(SmartAccountABI);
    const executeCallData = smartAccountInterface.encodeFunctionData('execute', [
      config.circle.usdcContract,
      0, // value (0 for ERC20 transfer)
      transferCallData,
    ]);

    // Get nonce
    const nonce = await smartAccountService.getNonce(smartAccount.accountAddress);

    // Check if account needs deployment
    const needsDeployment = await smartAccountService.needsDeployment(smartAccount.id);
    const initCode = needsDeployment ? await this.getInitCode(smartAccount) : '0x';

    // Estimate gas
    const gasEstimates = await this.estimateUserOpGas(executeCallData, initCode);

    // Get gas prices
    const feeData = await this.provider.getFeeData();

    // Build UserOperation
    const userOp = {
      sender: smartAccount.accountAddress,
      nonce,
      initCode,
      callData: executeCallData,
      callGasLimit: gasEstimates.callGasLimit,
      verificationGasLimit: gasEstimates.verificationGasLimit,
      preVerificationGas: gasEstimates.preVerificationGas,
      maxFeePerGas: feeData.maxFeePerGas || BigInt(0),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(0),
    };

    // Get paymaster data
    const paymasterData = await paymasterService.getPaymasterData(userOp, userId);

    // Estimate gas cost
    const gasCost = await paymasterService.estimateGasCostUSDC(userOp);

    // Generate UserOp hash
    const userOpHash = await this.getUserOpHash({
      ...userOp,
      paymasterAndData: paymasterData.paymasterAndData,
      signature: '0x', // Placeholder
    });

    // Save UserOperation to database
    await prisma.userOperation.create({
      data: {
        smartAccountId: smartAccount.id,
        userOpHash,
        sender: smartAccount.accountAddress,
        nonce,
        initCode,
        callData: executeCallData,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: paymasterData.paymasterAndData,
        paymasterUsed: paymasterData.paymasterAndData !== '0x',
        signature: '0x', // Will be updated when signed
        status: 'pending',
      },
    });

    return {
      userOpHash,
      userOperation: {
        ...userOp,
        paymasterAndData: paymasterData.paymasterAndData,
      },
      paymasterUsed: paymasterData.paymasterAndData !== '0x',
      estimatedGasUSDC: gasCost.gasCostUSDC,
    };
  }

  /**
   * Get init code for undeployed account
   */
  private async getInitCode(smartAccount: any): Promise<string> {
    // In production, this would construct the proper init code
    // For now, return empty as accounts should be deployed
    return '0x';
  }

  /**
   * Estimate gas for UserOperation
   */
  private async estimateUserOpGas(callData: string, initCode: string) {
    // Base gas estimates
    const callGasLimit = BigInt(config.gas.limits.transfer);
    const verificationGasLimit = initCode !== '0x'
      ? BigInt(config.gas.limits.deploy)
      : BigInt(100000);
    const preVerificationGas = BigInt(50000);

    return {
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
    };
  }

  /**
   * Get UserOperation hash
   */
  private async getUserOpHash(userOp: any): Promise<string> {
    try {
      // In production, call entryPoint.getUserOpHash
      // For now, generate a mock hash
      const hash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes32'],
          [userOp.sender, userOp.nonce, ethers.keccak256(userOp.callData)]
        )
      );
      return hash;
    } catch (error) {
      logger.error('Error getting UserOp hash:', error);
      throw new BlockchainError('Failed to get UserOperation hash');
    }
  }

  /**
   * Submit UserOperation to bundler
   */
  async submitUserOp(userOpHash: string, signature: string) {
    try {
      const userOp = await prisma.userOperation.findUnique({
        where: { userOpHash },
      });

      if (!userOp) {
        throw new BlockchainError('UserOperation not found');
      }

      // Update signature
      await prisma.userOperation.update({
        where: { userOpHash },
        data: { signature },
      });

      // In production, submit to bundler
      // const bundlerResponse = await bundlerClient.sendUserOperation(...)

      // For now, simulate submission
      logger.info(`UserOperation submitted: ${userOpHash}`);

      await prisma.userOperation.update({
        where: { userOpHash },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
        },
      });

      return {
        userOpHash,
        status: 'submitted',
      };
    } catch (error) {
      logger.error('Error submitting UserOp:', error);
      throw new BlockchainError('Failed to submit UserOperation');
    }
  }

  /**
   * Monitor UserOperation status
   */
  async monitorUserOp(userOpHash: string) {
    const userOp = await prisma.userOperation.findUnique({
      where: { userOpHash },
    });

    if (!userOp) {
      throw new BlockchainError('UserOperation not found');
    }

    // In production, query bundler/chain for status
    // For now, return current status
    return {
      userOpHash,
      status: userOp.status,
      transactionHash: userOp.transactionHash,
      confirmedAt: userOp.confirmedAt,
    };
  }

  /**
   * Get USDC balance for an address
   */
  async getUSDCBalance(address: string): Promise<string> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      logger.error('Error getting USDC balance:', error);
      throw new BlockchainError('Failed to get USDC balance');
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    try {
      const receipt = await waitForTransaction(txHash, 1, 60000);
      return receipt;
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      return null;
    }
  }

  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      logger.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get current gas prices
   */
  async getGasPrices() {
    const feeData = await this.provider.getFeeData();

    return {
      maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
      gasPrice: feeData.gasPrice?.toString() || '0',
    };
  }

  /**
   * Estimate transaction cost in USDC
   */
  async estimateTransactionCost(amount: string): Promise<{
    amount: string;
    gasCostUSDC: string;
    totalCostUSDC: string;
  }> {
    // Create a sample UserOp to estimate gas
    const gasEstimates = await this.estimateUserOpGas('0x', '0x');
    const feeData = await this.provider.getFeeData();

    const totalGas = gasEstimates.callGasLimit +
      gasEstimates.verificationGasLimit +
      gasEstimates.preVerificationGas;

    const gasCostWei = totalGas * (feeData.maxFeePerGas || BigInt(0));
    const gasCostETH = ethers.formatEther(gasCostWei);

    // Get ETH price (mock for now)
    const ethPrice = 2000; // $2000 per ETH
    const gasCostUSD = parseFloat(gasCostETH) * ethPrice;

    return {
      amount,
      gasCostUSDC: gasCostUSD.toFixed(6),
      totalCostUSDC: (parseFloat(amount) + gasCostUSD).toFixed(6),
    };
  }
}

export default new BlockchainService();
