import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '15000');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - JWT 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: { code: string; message: string } }>) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== Auth API ====================

export const authApi = {
  /**
   * 회원가입 - 이메일 인증 메일 발송
   * @param email 사용자 이메일
   * @param password 비밀번호
   * @returns 가입 메시지 및 사용자 정보
   */
  register: async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      message: string;
      user: {
        id: string;
        email: string;
        role: string;
        email_verified: boolean;
      };
    }>('/auth/register', {
      email,
      password,
    });
    return data;
  },

  /**
   * 이메일 인증 - 토큰 검증 후 자동 로그인
   * @param token 이메일 인증 토큰 (UUID)
   * @returns 인증 완료 메시지, 사용자 정보, JWT 토큰
   */
  verifyEmail: async (token: string) => {
    const { data } = await apiClient.get<{
      message: string;
      user: {
        id: string;
        email: string;
        role: string;
        status?: string;
        email_verified: boolean;
      };
      access_token: string;
    }>(`/auth/verify-email?token=${token}`);
    return data;
  },

  /**
   * 인증 이메일 재발송
   * @param email 사용자 이메일
   * @returns 재발송 메시지
   */
  resendVerification: async (email: string) => {
    const { data } = await apiClient.post<{ message: string }>(
      '/auth/resend-verification',
      { email }
    );
    return data;
  },

  /**
   * 로그인 - 이메일 인증 완료 필수
   * @param email 사용자 이메일
   * @param password 비밀번호
   * @returns 로그인 메시지, 사용자 정보, JWT 토큰
   */
  login: async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      message: string;
      user: {
        id: string;
        email: string;
        role: string;
        balance: string;
        status?: string;
        email_verified: boolean;
      };
      access_token: string;
    }>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  /**
   * 프로필 조회 - JWT 인증 필요
   * @returns 프로필 조회 메시지 및 사용자 정보 (balance 포함)
   */
  getProfile: async () => {
    const { data } = await apiClient.get<{
      message: string;
      user: {
        id: string;
        email: string;
        role: string;
        balance: string;
        status?: string;
        email_verified: boolean;
      };
    }>('/auth/profile');
    return data;
  },

  /**
   * 일일 자산 추이 조회 (JWT 인증 필요)
   * @param days 조회할 일수 (기본값: 7)
   * @returns 일일 자산 추이 데이터
   */
  getDailyBalanceHistory: async (days: number = 7) => {
    const { data } = await apiClient.get<{
      message: string;
      data: Array<{
        date: string; // YYYY-MM-DD 형식
        balance: string; // Wei 단위
        balanceEth: string; // ETH 단위
      }>;
    }>(`/auth/daily-balance-history?days=${days}`);
    return data;
  },
};

// ==================== Transaction API ====================

export const txApi = {
  /**
   * 입금 트랜잭션 저장
   * @param txHash 블록체인 트랜잭션 해시
   */
  reportDeposit: async (txHash: `0x${string}`) => {
    const { data } = await apiClient.post<{ message: string; data: unknown }>(
      '/tx/deposit',
      { txHash }
    );
    return data;
  },

  /**
   * 출금 제출
   */
  withdrawSubmit: async (payload: { to: string; amount: string; password: string }) => {
    const { data } = await apiClient.post<{
      message: string;
      data: { txId: string; txHash: string; amount: string; status: string };
    }>('/tx/withdraw/submit', payload);
    return data.data;
  },

  /**
   * 출금 승인
   */
  withdrawApprove: async (txId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        managerTxHash: string | null;
        status: string;
        isSmallTx: boolean;
        amount: string;
        requiresManagerApproval: boolean;
      };
    }>('/tx/withdraw/approve', { txId });
    return data.data;
  },

  /**
   * 출금 실행
   */
  withdrawExecute: async (txId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: { txHash: string; status: string };
    }>('/tx/withdraw/execute', { txId });
    return data.data;
  },

  /**
   * 사용자 입출금 기록 조회
   */
  getHistory: async (direction?: 'IN' | 'OUT') => {
    const query = direction ? `?direction=${direction}` : '';
    const { data } = await apiClient.get<{
      message: string;
      data: Array<{
        txHash: string;
        direction: 'IN' | 'OUT';
        status: string;
        amount: string;
        createdAt: string | null;
        from: string;
        to: string;
        blockNumber: string | null;
      }>;
    }>(`/tx/tx-history${query}`);
    return data.data;
  },
};

// ==================== Settings API ====================

export const settingsApi = {
  /**
   * 출금 화이트리스트 주소 등록 (JWT 인증)
   * @param to 등록할 주소
   */
  registerWhitelist: async (to: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: unknown;
    }>('/setting/withdraw-whitelist', {
      to,
    });
    return data;
  },

  /**
   * 출금 화이트리스트 주소 목록 조회
   */
  getWhitelist: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: Array<{
        id: string;
        to_address: string;
        created_at: string;
      }>;
    }>('/setting/withdraw-whitelist');
    return data;
  },

  /**
   * 출금 화이트리스트 주소 제거 (JWT 인증)
   * @param to 제거할 주소
   */
  removeWhitelist: async (to: string) => {
    const { data } = await apiClient.delete<{
      message: string;
      data: unknown;
    }>('/setting/withdraw-whitelist', {
      data: { to },
    });
    return data;
  },

  /**
   * 일일 출금 한도 설정 (JWT 인증)
   * @param maxEth 일일 출금 한도 (ETH 단위, 0이면 무제한)
   */
  setDailyLimit: async (maxEth: number) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        maxEth: string;
        maxWei: string;
        isUnlimited: boolean;
      };
    }>('/setting/daily-limit', {
      maxEth,
    });
    return data;
  },

  /**
   * 일일 출금 한도 조회 (JWT 인증)
   */
  getDailyLimit: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: {
        maxEth: string;
        maxWei: string;
        spentEth: string;
        spentWei: string;
        remainingEth: string | null;
        remainingWei: string | null;
        dayKey: number;
        todayKey: number;
        isUnlimited: boolean;
        isNewDay: boolean;
      };
    }>('/setting/daily-limit');
    return data;
  },
};

// ==================== Admin API ====================

export const adminApi = {
  /**
   * Omnibus 잔액 조회 (관리자 전용)
   */
  getOmnibusBalance: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: {
        balance: string;
        balanceEth: string;
      };
    }>('/admin/omnibus-balance');
    return data;
  },

  /**
   * Cold 잔액 조회 (관리자 전용)
   */
  getColdBalance: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: {
        balance: string;
        balanceEth: string;
      };
    }>('/admin/cold-balance');
    return data;
  },

  /**
   * 모든 유저 목록 조회 (관리자 전용)
   */
  getAllUsers: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: Array<{
        id: string;
        email: string;
        role: string;
        status: 'ACTIVE' | 'FROZEN';
        balance: string;
        balanceEth: string;
        createdAt: string;
      }>;
    }>('/admin/users');
    return data;
  },

  /**
   * 유저 동결/해제 (관리자 전용)
   */
  updateUserStatus: async (userId: string, status: 'ACTIVE' | 'FROZEN') => {
    const { data } = await apiClient.patch<{
      message: string;
      data: {
        id: string;
        status: 'ACTIVE' | 'FROZEN';
      };
    }>('/admin/users/status', {
      userId,
      status,
    });
    return data;
  },

  /**
   * 입출금 기록 조회 (관리자 전용)
   * DB에 저장된 입출금 이벤트를 조회하여 반환
   */
  getDepositWithdrawTransactions: async (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    const { data } = await apiClient.get<{
      message: string;
      data: {
        total: number;
        limit: number;
        transactions: Array<{
          type: 'DEPOSIT' | 'WITHDRAW';
          email: string | null;
          from?: string;
          to?: string;
          amount: string;
          timestamp: number;
        }>;
      };
    }>(`/admin/transactions${query}`);
    return data;
  },

  /**
   * Omnibus 지갑 동결 상태 조회 (관리자 전용)
   */
  getOmnibusPausedStatus: async () => {
    const { data } = await apiClient.get<{
      message: string;
      data: {
        paused: boolean;
        status: 'PAUSED' | 'ACTIVE';
      };
    }>('/admin/omnibus/paused');
    return data;
  },

  /**
   * Omnibus 지갑 동결/해제 (관리자 전용)
   * @param paused true: 동결, false: 해제
   */
  pauseOmnibus: async (paused: boolean) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        paused: boolean;
        message: string;
        txHash: string | null;
        blockNumber?: string;
      };
    }>('/admin/omnibus/pause', {
      paused,
    });
    return data;
  },

  /**
   * Cold Vault 입금 (관리자 전용)
   * @param amountEth ETH 단위 금액
   */
  coldDeposit: async (amountEth: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        blockNumber?: string;
        amount: string;
        amountEth: string;
      };
    }>('/admin/cold/deposit', {
      amountEth,
    });
    return data;
  },

  /**
   * Cold Vault 이동 요청 (관리자 전용)
   * @param amountEth ETH 단위 금액
   */
  coldRequestMove: async (amountEth: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        blockNumber?: string;
        moveId: string;
        amount: string;
        amountEth: string;
      };
    }>('/admin/cold/move/request', {
      amountEth,
    });
    return data;
  },

  /**
   * Cold Vault 이동 승인 (관리자 전용)
   * @param moveId 이동 요청 ID (bytes32)
   */
  coldApproveMove: async (moveId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        blockNumber?: string;
        TSStxHash: string;
        TSSblockNumber?: string;
        moveId: string;
        approvedAdmin1: boolean;
        approvedAdmin2: boolean;
        isExecutable: boolean;
      };
    }>('/admin/cold/move/approve', {
      moveId,
    });
    return data;
  },

  /**
   * Cold Vault 이동 실행 (관리자 전용)
   * @param moveId 이동 요청 ID (bytes32)
   */
  coldExecuteMove: async (moveId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        blockNumber?: string;
        moveId: string;
        amount: string;
        amountEth: string;
        executed: boolean;
      };
    }>('/admin/cold/move/execute', {
      moveId,
    });
    return data;
  },

  /**
   * 승인 대기 중인 출금 요청 목록 조회 (관리자 전용)
   * @param limit 조회할 최대 개수 (기본값: 50)
   */
  getPendingWithdrawals: async (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    const { data } = await apiClient.get<{
      message: string;
      data: {
        total: number;
        requests: Array<{
          txId: string;
          email: string | null;
          to: string;
          amount: string;
          amountEth: string;
          approvedTss: boolean;
          approvedManager: boolean;
          executed: boolean;
          requiresManagerApproval: boolean;
        }>;
      };
    }>(`/admin/withdrawals/pending${query}`);
    return data;
  },

  /**
   * 특정 출금 요청 정보 조회 (관리자 전용)
   * @param txId 출금 요청 ID
   */
  getWithdrawalRequestInfo: async (txId: string) => {
    const { data } = await apiClient.get<{
      message: string;
      data: {
        txId: string;
        email: string | null;
        userId: string | null;
        to: string;
        amount: string;
        amountEth: string;
        approvedTss: boolean;
        approvedManager: boolean;
        executed: boolean;
        isSmallTx: boolean;
        requiresManagerApproval: boolean;
      };
    }>(`/admin/withdrawals/${txId}`);
    return data;
  },

  /**
   * 출금 요청 Manager 승인 (관리자 전용)
   * @param txId 출금 요청 ID
   */
  approveUserWithdrawal: async (txId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        blockNumber?: string;
        txId: string;
        amount: string;
        amountEth: string;
        approvedTss: boolean;
        approvedManager: boolean;
        executed: boolean;
        status: string;
      };
    }>('/admin/withdrawals/approve', {
      txId,
    });
    return data;
  },

  /**
   * 출금 실행 (관리자 전용)
   * - 관리자가 승인한 출금 요청을 실행하여 실제 출금 및 잔액 차감 수행
   * @param txId 출금 요청 ID
   */
  executeUserWithdrawal: async (txId: string) => {
    const { data } = await apiClient.post<{
      message: string;
      data: {
        txHash: string;
        status: string;
        amount: string;
        amountEth: string;
        newBalance: string;
        email: string | null;
        userId: string | null;
      };
    }>('/admin/withdrawals/execute', {
      txId,
    });
    return data;
  },
};

