// src/contracts/addresses.ts

/**
 * Contract addresses for different networks
 */

export const contracts = {
  // Base Mainnet (Chain ID: 8453)
  base: {
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // ERC-4337 EntryPoint v0.6
    // These need to be deployed or configured:
    accountFactory: process.env.ACCOUNT_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    paymaster: process.env.CIRCLE_PAYMASTER_ADDRESS || '0x0000000000000000000000000000000000000000',
  },

  // Base Sepolia Testnet (Chain ID: 84532)
  baseSepolia: {
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Circle USDC on Base Sepolia
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    accountFactory: process.env.ACCOUNT_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    paymaster: process.env.CIRCLE_PAYMASTER_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
};

/**
 * Get contract addresses for a specific network
 */
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 8453:
      return contracts.base;
    case 84532:
      return contracts.baseSepolia;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export default contracts;
