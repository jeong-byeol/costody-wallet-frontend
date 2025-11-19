// src/components/wallet/NetworkGuard.tsx
import { useAccount, useSwitchChain } from 'wagmi';
import { useEffect } from 'react';
import { SEPOLIA_CHAIN_ID } from '@/types'; // ✅ 이제 작동
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface NetworkGuardProps {
  children: React.ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isConnected && chain && chain.id !== SEPOLIA_CHAIN_ID) {
      // Auto switch attempt
      switchChain?.({ chainId: SEPOLIA_CHAIN_ID });
    }
  }, [chain, isConnected, switchChain]);

  if (!isConnected) {
    return <>{children}</>;
  }

  if (chain?.id !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              잘못된 네트워크
            </CardTitle>
            <CardDescription>
              Sepolia 테스트넷으로 전환이 필요합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              현재 네트워크: <strong>{chain?.name}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              필요한 네트워크: <strong>Sepolia (Chain ID: 11155111)</strong>
            </p>
            <Button
              onClick={() => switchChain?.({ chainId: SEPOLIA_CHAIN_ID })}
              className="w-full"
            >
              Sepolia로 전환
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}