// src/config/networks.ts

import { config } from './index';

export type NetworkType = 'mainnet' | 'testnet';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  rpcUrlBackup?: string;
  bundlerUrl: string;
  usdcContract: string;
  accountFactory: string;
  entryPoint: string;
  paymaster: string;
  explorerUrl: string;
  currency: string;
}

export const networks: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: config.blockchain.baseRpcUrl,
    rpcUrlBackup: config.blockchain.baseRpcUrlBackup,
    bundlerUrl: config.bundler.rpcUrl,
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    accountFactory: config.accountFactory.address,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    paymaster: config.paymaster.address,
    explorerUrl: 'https://basescan.org',
    currency: 'ETH',
  },
  testnet: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: config.blockchain.sepoliaRpcUrl || 'https://sepolia.base.org',
    rpcUrlBackup: 'https://base-sepolia.g.alchemy.com/v2/demo',
    bundlerUrl: config.bundler.rpcUrl.replace('base-mainnet', 'base-sepolia'),
    usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    accountFactory: config.accountFactory.address,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    paymaster: config.paymaster.address || '0x0000000000000000000000000000000000000000',
    explorerUrl: 'https://sepolia.basescan.org',
    currency: 'ETH',
  },
};

/**
 * Get network configuration based on environment or explicit selection
 */
export function getNetworkConfig(network?: NetworkType): NetworkConfig {
  const defaultNetwork = config.env === 'production' ? 'mainnet' : 'testnet';
  const selectedNetwork = network || (defaultNetwork as NetworkType);
  return networks[selectedNetwork];
}

/**
 * Get current active network from environment
 */
export function getCurrentNetwork(): NetworkType {
  return config.env === 'production' ? 'mainnet' : 'testnet';
}

/**
 * Check if network is valid
 */
export function isValidNetwork(network: string): network is NetworkType {
  return network === 'mainnet' || network === 'testnet';
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerTxUrl(txHash: string, network?: NetworkType): string {
  const networkConfig = getNetworkConfig(network);
  return `${networkConfig.explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for address
 */
export function getExplorerAddressUrl(address: string, network?: NetworkType): string {
  const networkConfig = getNetworkConfig(network);
  return `${networkConfig.explorerUrl}/address/${address}`;
}

export default {
  networks,
  getNetworkConfig,
  getCurrentNetwork,
  isValidNetwork,
  getExplorerTxUrl,
  getExplorerAddressUrl,
};
