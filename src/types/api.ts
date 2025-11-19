// src/types/api.ts

// ============================================
// Auth
// ============================================
export interface RegisterRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterResponse {
    userId: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    accessToken: string;
    userId: string;
  }
  
  // ============================================
  // UserKey
  // ============================================
  export interface CreateUserKeyResponse {
    userKey: `0x${string}`;
  }
  
  export interface GetUserKeyHashResponse {
    userKeyHash: `0x${string}`;
  }
  
  // ============================================
  // Deposit
  // ============================================
  export interface Deposit {
    id: string;
    txHash: string;
    logIndex: number;
    userKeyHash: `0x${string}`;
    amountWei: string;
    from: string;
    blockNumber: number;
    createdAt: string;
  }
  
  export interface GetDepositsParams {
    cursor?: string;
    limit?: number;
  }
  
  export interface GetDepositsResponse {
    deposits: Deposit[];
    nextCursor?: string;
  }
  
  // ============================================
  // Policy
  // ============================================
  export interface SetWhitelistRequest {
    userId: string;
    to: string;
    allowed: boolean;
  }
  
  export interface SetWhitelistBatchRequest {
    userId: string;
    items: Array<{
      to: string;
      allowed: boolean;
    }>;
  }
  
  export interface SetDailyLimitRequest {
    userId: string;
    maxEthPerDay: string; // decimal string
  }
  
  export interface PolicyTransactionResponse {
    txHash: string;
  }
  
  export interface GetPolicyStatusParams {
    userId: string;
  }
  
  export interface GetPolicyStatusResponse {
    wl: string[];
    dailyLimitWei: string;
    spentTodayWei: string;
    dayKey: string;
  }
  
  // ============================================
  // Withdrawal
  // ============================================
  export type WithdrawalState =
    | 'pending'
    | 'auto_wait'
    | 'manual_wait'
    | 'executed'
    | 'failed';
  
  export interface CreateWithdrawalIntentRequest {
    to: string;
    amountEth: string; // decimal string
    password: string;
  }
  
  export interface CreateWithdrawalIntentResponse {
    reqId: string;
  }
  
  export interface SubmitWithdrawalRequest {
    reqId: string;
  }
  
  export interface SubmitWithdrawalResponse {
    state: WithdrawalState;
    txHash?: string;
  }
  
  export interface Withdrawal {
    id: string;
    userId: string;
    to: string;
    amountWei: string;
    state: WithdrawalState;
    txHash?: string;
    blockNumber?: number;
    createdAt: string;
    updatedAt: string;
  }
  
  // ============================================
  // Status
  // ============================================
  export interface VaultBalanceResponse {
    omnibusEthWei: string;
    coldEthWei: string;
    deviation: string; // percentage as decimal string
  }
  
  export interface HealthResponse {
    rpcOk: boolean;
    indexerLagBlocks: number;
    lastAnchorAt: string;
    dbOk: boolean;
  }
  
  // ============================================
  // Error
  // ============================================
  export interface ApiError {
    error: {
      code: string;
      message: string;
    };
  }