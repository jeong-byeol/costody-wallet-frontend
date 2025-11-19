// src/stores/chainStore.ts
import { create } from 'zustand';

interface ChainState {
  // State
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  connected: boolean;

  // Actions
  setChainState: (data: {
    address?: `0x${string}`;
    chainId?: number;
    connected: boolean;
  }) => void;
  disconnect: () => void;
}

export const useChainStore = create<ChainState>()((set) => ({
  // Initial state
  address: undefined,
  chainId: undefined,
  connected: false,

  // Actions
  setChainState: (data) => set(data),

  disconnect: () =>
    set({
      address: undefined,
      chainId: undefined,
      connected: false,
    }),
}));