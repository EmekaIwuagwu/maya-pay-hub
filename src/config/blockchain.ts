// src/config/blockchain.ts

import { ethers } from 'ethers';
import { config } from './index';
import { logger } from '../utils/logger';
import { getNetworkConfig, NetworkType, getCurrentNetwork } from './networks';

// Provider cache
const providerCache = new Map<string, ethers.JsonRpcProvider>();

/**
 * Get provider for specific network
 */
export function getProvider(network?: NetworkType): ethers.JsonRpcProvider {
  const selectedNetwork = network || getCurrentNetwork();
  const cacheKey = selectedNetwork;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const networkConfig = getNetworkConfig(selectedNetwork);
  const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
  providerCache.set(cacheKey, provider);

  return provider;
}

/**
 * Get bundler provider for specific network
 */
export function getBundlerProvider(network?: NetworkType): ethers.JsonRpcProvider {
  const selectedNetwork = network || getCurrentNetwork();
  const networkConfig = getNetworkConfig(selectedNetwork);
  const cacheKey = `bundler-${selectedNetwork}`;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  const provider = new ethers.JsonRpcProvider(networkConfig.bundlerUrl);
  providerCache.set(cacheKey, provider);

  return provider;
}

// Legacy exports for backward compatibility
export const baseProvider = getProvider('mainnet');
export const baseProviderBackup = new ethers.JsonRpcProvider('https://mainnet.base.org');
export const sepoliaProvider = getProvider('testnet');
export const bundlerProvider = getBundlerProvider();

// Fallback provider
export const fallbackProvider = new ethers.FallbackProvider([
  { provider: baseProvider, priority: 1, stallTimeout: 2000, weight: 2 },
  { provider: baseProviderBackup, priority: 2, stallTimeout: 3000, weight: 1 },
]);

/**
 * Verify blockchain connection
 */
export async function verifyBlockchainConnection(network?: NetworkType): Promise<boolean> {
  try {
    const provider = getProvider(network);
    const networkInfo = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const networkConfig = getNetworkConfig(network);

    logger.info(`✅ Connected to ${networkConfig.name} (Chain ID: ${networkInfo.chainId})`);
    logger.info(`Current block number: ${blockNumber}`);

    return true;
  } catch (error) {
    logger.error('❌ Blockchain connection failed:', error);
    return false;
  }
}

/**
 * Get current gas prices
 */
export async function getGasPrices(network?: NetworkType): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}> {
  const feeData = await getProvider(network).getFeeData();

  if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
    throw new Error('Failed to fetch gas prices');
  }

  return {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  };
}

/**
 * Calculate gas costs based on strategy
 */
export async function calculateGasCost(
  gasLimit: bigint,
  strategy: 'low' | 'medium' | 'high' | 'instant' = 'medium'
): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedCost: bigint;
}> {
  const feeData = await getGasPrices();

  // Adjust based on strategy
  let multiplier = 1.0;
  switch (strategy) {
    case 'low':
      multiplier = 0.8;
      break;
    case 'medium':
      multiplier = 1.0;
      break;
    case 'high':
      multiplier = 1.2;
      break;
    case 'instant':
      multiplier = 1.5;
      break;
  }

  const maxFeePerGas = BigInt(Math.floor(Number(feeData.maxFeePerGas) * multiplier));
  const maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * multiplier));

  const estimatedCost = gasLimit * maxFeePerGas;

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedCost,
  };
}

/**
 * Format Wei to ETH string
 */
export function formatETH(wei: bigint): string {
  return ethers.formatEther(wei);
}

/**
 * Parse ETH string to Wei
 */
export function parseETH(eth: string): bigint {
  return ethers.parseEther(eth);
}

/**
 * Format Wei to USDC string (6 decimals)
 */
export function formatUSDC(rawAmount: bigint): string {
  return ethers.formatUnits(rawAmount, 6);
}

/**
 * Parse USDC string to raw amount (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Get transaction receipt with retry
 */
export async function getTransactionReceipt(
  txHash: string,
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<ethers.TransactionReceipt | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const receipt = await getProvider().getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      logger.warn(`Failed to get receipt for ${txHash}, attempt ${i + 1}/${maxRetries}`);
    }

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  return null;
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txHash: string,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<ethers.TransactionReceipt> {
  const receipt = await getProvider().waitForTransaction(txHash, confirmations, timeout);

  if (!receipt) {
    throw new Error('Transaction receipt not found');
  }

  return receipt;
}

export default {
  baseProvider,
  baseProviderBackup,
  fallbackProvider,
  bundlerProvider,
  sepoliaProvider,
  getProvider,
  verifyBlockchainConnection,
  getGasPrices,
  calculateGasCost,
  formatETH,
  parseETH,
  formatUSDC,
  parseUSDC,
  isValidAddress,
  getTransactionReceipt,
  waitForTransaction,
};
