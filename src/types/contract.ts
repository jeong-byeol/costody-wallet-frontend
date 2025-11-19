// src/types/contract.ts

export interface OmnibusVaultABI {
    depositETH: (userKey: `0x${string}`) => void;
  }
  
  export interface ContractAddresses {
    omnibusVault: `0x${string}`;
    policyGuard: `0x${string}`;
    coldVault: `0x${string}`;
    merkleAnchor?: `0x${string}`;
  }
  
  export const SEPOLIA_CHAIN_ID = 11155111;
  
  export const CONTRACT_ADDRESSES: ContractAddresses = {
    omnibusVault: (import.meta.env.VITE_OMNIBUS_VAULT ||
      '0x0000000000000000000000000000000000000000') as `0x${string}`,
    policyGuard: '0x0000000000000000000000000000000000000000',
    coldVault: '0x0000000000000000000000000000000000000000',
  };