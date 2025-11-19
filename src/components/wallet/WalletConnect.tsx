// src/components/wallet/WalletConnect.tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';
import { truncateAddress } from '@/lib/format';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Get MetaMask connector
  const metaMaskConnector = connectors.find((c) => c.id === 'injected');

  if (isConnected && address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            연결된 지갑
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">주소</span>
              <Badge variant="outline" className="font-mono">
                {truncateAddress(address)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">네트워크</span>
              <Badge
                variant={chain?.id === 11155111 ? 'default' : 'destructive'}
              >
                {chain?.name || 'Unknown'}
              </Badge>
            </div>
          </div>

          {chain?.id !== 11155111 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">잘못된 네트워크</p>
                <p className="text-xs mt-1">
                  Sepolia 테스트넷으로 전환해주세요
                </p>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => disconnect()}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            지갑 연결 해제
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          지갑 연결
        </CardTitle>
        <CardDescription>
          MetaMask를 연결하여 입금/출금 기능을 사용하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
          disabled={isPending || !metaMaskConnector}
          className="w-full"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isPending ? '연결 중...' : 'MetaMask 연결'}
        </Button>
        {!metaMaskConnector && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            MetaMask가 설치되지 않았습니다
          </p>
        )}
      </CardContent>
    </Card>
  );
}