import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_PUBLIC_RPC_URL),
  },
});

// 체인 ID 상수
export const SEPOLIA_CHAIN_ID = 11155111;
