// src/types/index.ts (수정)
export type WithdrawalState =
  | 'pending'
  | 'auto_wait'
  | 'manual_wait'
  | 'executed'
  | 'failed';

export type UserStatus = 'ACTIVE' | 'FROZEN';

// ✅ 추가: Chain 상수
export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ADDRESSES = {
  omnibusVault: (import.meta.env.VITE_OMNIBUS_VAULT || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  policyGuard: (import.meta.env.VITE_POLICY_GUARD || '0x0000000000000000000000000000000000000000') as `0x${string}`,
  coldVault: (import.meta.env.VITE_COLD_VAULT || '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface DepositListResponse {
  deposits: Array<{
    id: string;
    txHash: string;
    userKeyHash: string;
    amountWei: string;
    from: string;
    blockNumber: number;
    createdAt: string;
  }>;
  cursor?: string;
}

export interface WithdrawalResponse {
  id: string;
  to: string;
  amountWei: string;
  state: WithdrawalState;
  txHash?: string;
  blockNumber?: number;
  createdAt: string;
}

export interface VaultBalanceResponse {
  omnibusEthWei: string;
  coldEthWei: string;
  deviation: string;
}

export interface PolicyStatusResponse {
  wl: string[];
  dailyLimitWei: string;
  spentTodayWei: string;
  dayKey: string;
}