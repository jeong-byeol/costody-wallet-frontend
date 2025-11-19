// src/stores/sessionStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserStatus = 'ACTIVE' | 'FROZEN';

interface SessionState {
  // State
  accessToken: string | null;
  userId: string | null;
  userKey: `0x${string}` | null; // 화면 표시 금지, deposit 전용
  status: UserStatus | null;

  // Actions
  setSession: (data: {
    accessToken: string;
    userId: string;
    userKey: `0x${string}`;
    status?: UserStatus;
  }) => void;
  clearSession: () => void;
  setUserKey: (userKey: `0x${string}`) => void;
  setStatus: (status: UserStatus) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      // Initial state
      accessToken: null,
      userId: null,
      userKey: null,
      status: null,

      // Actions
      setSession: (data) =>
        set({
          accessToken: data.accessToken,
          userId: data.userId,
          userKey: data.userKey,
          status: data.status || 'ACTIVE',
        }),

      clearSession: () =>
        set({
          accessToken: null,
          userId: null,
          userKey: null,
          status: null,
        }),

      setUserKey: (userKey) => set({ userKey }),

      setStatus: (status) => set({ status }),
    }),
    {
      name: 'custody-session',
      // userKey는 메모리만 저장, 새로고침 시 재요청
      partialize: (state) => ({
        accessToken: state.accessToken,
        userId: state.userId,
        status: state.status,
        // userKey는 제외
      }),
    }
  )
);