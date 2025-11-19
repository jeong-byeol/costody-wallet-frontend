// src/stores/session.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserStatus = 'ACTIVE' | 'FROZEN';

interface SessionState {
  accessToken?: string;
  userId?: string;
  userKey?: `0x${string}`;
  status?: UserStatus;
  setSession: (session: {
    accessToken: string;
    userId: string;
    userKey: `0x${string}`;
    status: UserStatus;
  }) => void;
  clearSession: () => void;
  updateStatus: (status: UserStatus) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      userId: undefined,
      userKey: undefined,
      status: undefined,

      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          userId: session.userId,
          userKey: session.userKey,
          status: session.status,
        }),

      clearSession: () =>
        set({
          accessToken: undefined,
          userId: undefined,
          userKey: undefined,
          status: undefined,
        }),

      updateStatus: (status) => set({ status }),
    }),
    {
      name: 'custody-session',
      // userKey는 메모리에만 저장 (persist 제외)
      partialize: (state) => ({
        accessToken: state.accessToken,
        userId: state.userId,
        status: state.status,
        // userKey는 제외
      }),
    }
  )
);