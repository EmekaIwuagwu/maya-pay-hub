// src/services/smartAccount.service.ts

import { ethers } from 'ethers';
import { prisma } from '../config/database';
import { config } from '../config';
import { getProvider } from '../config/blockchain';
import { logger } from '../utils/logger';
import { BlockchainError } from '../utils/errors';

// Import ABIs
import SimpleAccountFactoryABI from '../contracts/abis/SimpleAccountFactory.json';
import SimpleAccountABI from '../contracts/abis/SmartAccount.json';
import EntryPointABI from '../contracts/abis/EntryPoint.json';

class SmartAccountService {
  private provider: ethers.JsonRpcProvider;
  private accountFactory: ethers.Contract;
  private entryPoint: ethers.Contract;

  constructor() {
    this.provider = getProvider();

    this.accountFactory = new ethers.Contract(
      config.accountFactory.address,
      SimpleAccountFactoryABI,
      this.provider
    );

    this.entryPoint = new ethers.Contract(
      config.entryPoint.address,
      EntryPointABI,
      this.provider
    );
  }

  /**
   * Get counterfactual address for smart account
   * (address before deployment)
   */
  async getCounterfactualAddress(ownerPublicKey: string): Promise<string> {
    try {
      const owner = this.publicKeyToAddress(ownerPublicKey);
      const salt = 0; // Can use different salts for multiple accounts

      // Call factory's getAddress function
      const address = await this.accountFactory.getAddress(owner, salt);
      return address;
    } catch (error) {
      logger.error('Error getting counterfactual address:', error);
      throw new BlockchainError('Failed to generate smart account address');
    }
  }

  /**
   * Check if smart account is deployed on-chain
   */
  async isAccountDeployed(accountAddress: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(accountAddress);
      return code !== '0x';
    } catch (error) {
      logger.error('Error checking account deployment:', error);
      return false;
    }
  }

  /**
   * Deploy smart account on-chain
   */
  async deploySmartAccount(smartAccountId: string) {
    const smartAccount = await prisma.smartAccount.findUnique({
      where: { id: smartAccountId },
      include: { user: true },
    });

    if (!smartAccount) {
      throw new Error('Smart account not found');
    }

    if (smartAccount.isDeployed) {
      logger.warn(`Smart account ${smartAccountId} already deployed`);
      return smartAccount;
    }

    try {
      const owner = this.publicKeyToAddress(smartAccount.web3AuthPublicKey!);
      const salt = 0;

      // Note: In production, you would use a server wallet to deploy
      // For now, this is a placeholder showing the logic
      // You'll need a funded wallet to sign this transaction

      // const tx = await this.accountFactory.createAccount(owner, salt);
      // const receipt = await tx.wait();

      // For now, mark as pending deployment
      const updated = await prisma.smartAccount.update({
        where: { id: smartAccountId },
        data: {
          isDeployed: false, // Will be true once actually deployed
          // deploymentTxHash: receipt.hash,
          // deployedAt: new Date()
        },
      });

      logger.info(`Smart account deployment initiated: ${smartAccount.accountAddress}`);

      return updated;
    } catch (error) {
      logger.error('Error deploying smart account:', error);
      throw new BlockchainError('Failed to deploy smart account');
    }
  }

  /**
   * Get current nonce for smart account
   */
  async getNonce(accountAddress: string): Promise<bigint> {
    try {
      const nonce = await this.entryPoint.getNonce(accountAddress, 0);
      return BigInt(nonce.toString());
    } catch (error) {
      logger.warn(`Error getting nonce for ${accountAddress}, returning 0:`, error);
      return BigInt(0);
    }
  }

  /**
   * Get smart account balance (USDC)
   */
  async getSmartAccountBalance(smartAccountId: string) {
    const smartAccount = await prisma.smartAccount.findUnique({
      where: { id: smartAccountId },
    });

    if (!smartAccount) {
      throw new Error('Smart account not found');
    }

    // Import USDC contract
    const USDCABI = await import('../contracts/abis/USDC.json');
    const usdcContract = new ethers.Contract(
      config.circle.usdcContract,
      USDCABI,
      this.provider
    );

    try {
      const balance = await usdcContract.balanceOf(smartAccount.accountAddress);
      const balanceFormatted = ethers.formatUnits(balance, 6); // USDC has 6 decimals

      // Update database
      await prisma.smartAccount.update({
        where: { id: smartAccountId },
        data: {
          balanceUSDC: balanceFormatted,
          lastUsedAt: new Date(),
        },
      });

      return {
        balanceRaw: balance.toString(),
        balance: balanceFormatted,
        address: smartAccount.accountAddress,
      };
    } catch (error) {
      logger.error('Error getting smart account balance:', error);
      throw new BlockchainError('Failed to get balance');
    }
  }

  /**
   * Get smart account by user ID
   */
  async getSmartAccountByUserId(userId: string) {
    return await prisma.smartAccount.findFirst({
      where: {
        userId,
        isPrimary: true,
      },
    });
  }

  /**
   * Get smart account by address
   */
  async getSmartAccountByAddress(address: string) {
    return await prisma.smartAccount.findUnique({
      where: { accountAddress: address.toLowerCase() },
    });
  }

  /**
   * Convert public key to Ethereum address
   */
  private publicKeyToAddress(publicKey: string): string {
    try {
      // Remove '0x' if present
      const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;

      // If key is compressed (33 bytes = 66 hex chars), expand it
      if (cleanKey.length === 66) {
        // For compressed keys, we need to decompress
        // This is a simplified version - in production use proper elliptic curve library
        const fullKey = cleanKey; // Placeholder
        return this.deriveAddressFromKey(fullKey);
      }

      // Full key (64 bytes = 128 hex chars)
      if (cleanKey.length === 128) {
        return this.deriveAddressFromKey(cleanKey);
      }

      // If it's already an address
      if (cleanKey.length === 40 || ethers.isAddress(publicKey)) {
        return ethers.getAddress(publicKey);
      }

      throw new Error('Invalid public key format');
    } catch (error) {
      logger.error('Error converting public key to address:', error);
      throw new Error('Failed to derive address from public key');
    }
  }

  /**
   * Derive Ethereum address from public key
   */
  private deriveAddressFromKey(publicKeyHex: string): string {
    // Hash the public key with keccak256
    const hash = ethers.keccak256('0x' + publicKeyHex);

    // Take last 20 bytes as address
    const address = '0x' + hash.slice(-40);

    return ethers.getAddress(address);
  }

  /**
   * Get smart account contract instance
   */
  getSmartAccountContract(accountAddress: string): ethers.Contract {
    return new ethers.Contract(
      accountAddress,
      SimpleAccountABI,
      this.provider
    );
  }

  /**
   * Update smart account nonce
   */
  async updateNonce(smartAccountId: string, nonce: bigint) {
    await prisma.smartAccount.update({
      where: { id: smartAccountId },
      data: { nonce },
    });
  }

  /**
   * Check if account needs deployment before transaction
   */
  async needsDeployment(smartAccountId: string): Promise<boolean> {
    const smartAccount = await prisma.smartAccount.findUnique({
      where: { id: smartAccountId },
    });

    if (!smartAccount) {
      throw new Error('Smart account not found');
    }

    if (smartAccount.isDeployed) {
      return false;
    }

    // Check on-chain
    const isDeployed = await this.isAccountDeployed(smartAccount.accountAddress);

    if (isDeployed) {
      // Update database
      await prisma.smartAccount.update({
        where: { id: smartAccountId },
        data: {
          isDeployed: true,
          deployedAt: new Date(),
        },
      });
      return false;
    }

    return true;
  }
}

export default new SmartAccountService();
