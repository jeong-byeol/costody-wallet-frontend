import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Settings, 
  Activity as ActivityIcon,
  Shield,
  LogOut,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { authApi, txApi } from '@/lib/api';
import { useSessionStore, useUiStore, useChainStore } from '@/stores';
import { SEPOLIA_CHAIN_ID } from '@/lib/wagmi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { status, clearSession } = useSessionStore();
  const setChain = useChainStore((state) => state.setChain);
  const addNotification = useUiStore((state) => state.addNotification);

  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [balanceHistory, setBalanceHistory] = useState<Array<{ date: string; balance: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState<7 | 30>(7);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (balance !== '0' || historyDays) {
      loadBalanceHistory();
    }
  }, [historyDays, balance]);

  // 지갑 연결 후 체인 체크 및 정보 저장
  useEffect(() => {
    if (isConnected && address) {
      // 체인 정보 저장
      const currentChainId = chainId || SEPOLIA_CHAIN_ID;
      setChain({ address, chainId: currentChainId });
      
      // 주소가 변경되었을 때만 성공 메시지 표시 (새로 연결된 경우)
      if (address !== prevAddress) {
        addNotification({ type: 'success', message: '지갑이 연결되었습니다.' });
        setPrevAddress(address);
      }
      
      // Sepolia가 아니면 전환 시도
      if (chainId && chainId !== SEPOLIA_CHAIN_ID && switchChain) {
        try {
          switchChain({ chainId: SEPOLIA_CHAIN_ID });
        } catch (error) {
          addNotification({ 
            type: 'warning', 
            message: 'Sepolia 네트워크로 전환해주세요.' 
          });
        }
      }
    } else if (!isConnected && prevAddress) {
      // 연결이 해제된 경우
      setPrevAddress(undefined);
    }
  }, [isConnected, address, chainId, prevAddress, setChain, switchChain, addNotification]);

  // 메타마스크 연결 핸들러
  const handleConnectWallet = async () => {
    try {
      // 여러 방법으로 MetaMask connector 찾기
      let metaMaskConnector = connectors.find((c) => 
        c.id === 'injected' || 
        c.id === 'io.metamask' ||
        c.name?.toLowerCase().includes('metamask') ||
        c.name?.toLowerCase().includes('injected')
      );
      
      // 찾지 못하면 첫 번째 connector 사용 (보통 injected가 유일한 경우)
      if (!metaMaskConnector && connectors.length > 0) {
        metaMaskConnector = connectors[0];
      }
      
      if (!metaMaskConnector) {
        console.error('사용 가능한 connector:', connectors.map(c => ({ id: c.id, name: c.name })));
        addNotification({ 
          type: 'error', 
          message: 'MetaMask를 설치해주세요. 또는 브라우저를 새로고침해주세요.' 
        });
        return;
      }

      // connector가 ready 상태인지 확인
      if (metaMaskConnector.type === 'injected' && !(window as any).ethereum) {
        addNotification({ 
          type: 'error', 
          message: 'MetaMask가 감지되지 않습니다. MetaMask를 설치하고 페이지를 새로고침해주세요.' 
        });
        return;
      }

      console.log('연결 시도 중:', { 
        id: metaMaskConnector.id, 
        name: metaMaskConnector.name,
        type: metaMaskConnector.type,
        ready: metaMaskConnector.ready
      });
      
      await connect({ connector: metaMaskConnector });
      // 성공 메시지는 useEffect에서 처리됨
    } catch (error: any) {
      console.error('지갑 연결 오류:', error);
      const errorMessage = error?.message || error?.shortMessage || '지갑 연결에 실패했습니다.';
      addNotification({ 
        type: 'error', 
        message: errorMessage 
      });
    }
  };

  // 메타마스크 연결 해제 핸들러
  const handleDisconnectWallet = () => {
    disconnect();
    useChainStore.getState().clearChain();
    addNotification({ type: 'info', message: '지갑 연결이 해제되었습니다.' });
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    handleDisconnectWallet();
    clearSession();
    addNotification({ type: 'info', message: '로그아웃되었습니다.' });
    navigate('/login');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 프로필 조회하여 잔액 가져오기
      const profile = await authApi.getProfile();
      // balance는 Wei 단위이므로 ETH로 변환
      setBalance(formatEther(BigInt(profile.user.balance)));
      
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '데이터 로드 실패',
      });
    } finally {
      setLoading(false);
    }
  };

  // 일일 자산 추이 데이터 로드
  const loadBalanceHistory = async () => {
    try {
      setHistoryLoading(true);
      
      // API에서 일일 자산 추이 데이터 가져오기 시도
      try {
        const response = await authApi.getDailyBalanceHistory(historyDays);
        const formattedData = response.data.map((item) => ({
          date: new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
          balance: parseFloat(item.balanceEth),
        }));
        
        // 오늘 날짜가 없으면 추가
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayInData = response.data.find((item) => item.date === todayStr);
        
        if (!todayInData && balance) {
          formattedData.push({
            date: today.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
            balance: parseFloat(balance),
          });
        }
        
        setBalanceHistory(formattedData);
      } catch (apiError: any) {
        // API가 없거나 실패하면 트랜잭션 히스토리로 계산
        console.warn('일일 자산 추이 API 호출 실패, 트랜잭션 히스토리로 계산:', apiError);
        
        const transactions = await txApi.getHistory();
        const currentBalance = parseFloat(balance || '0');
        
        // 최근 N일간의 날짜 배열 생성 (오늘 포함)
        const dates: string[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 시간을 0으로 설정하여 날짜만 비교
        
        for (let i = historyDays - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        
        // 각 날짜별 잔액 계산 (역순으로 계산)
        const history: Array<{ date: string; balance: number }> = [];
        let runningBalance = currentBalance;
        
        // 날짜별로 그룹화
        const transactionsByDate = new Map<string, number>();
        transactions.forEach((tx) => {
          if (tx.createdAt) {
            const txDate = new Date(tx.createdAt);
            txDate.setHours(0, 0, 0, 0); // 시간을 0으로 설정
            const dateStr = txDate.toISOString().split('T')[0];
            const amount = parseFloat(formatEther(BigInt(tx.amount)));
            const change = tx.direction === 'IN' ? amount : -amount;
            transactionsByDate.set(dateStr, (transactionsByDate.get(dateStr) || 0) + change);
          }
        });
        
        // 각 날짜별 잔액 계산 (역순으로)
        for (let i = dates.length - 1; i >= 0; i--) {
          const dateStr = dates[i];
          const change = transactionsByDate.get(dateStr) || 0;
          
          // 오늘 날짜면 현재 잔액 사용
          const todayStr = today.toISOString().split('T')[0];
          if (dateStr === todayStr) {
            history.unshift({
              date: today.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
              balance: currentBalance,
            });
            runningBalance = currentBalance - change; // 다음 날짜를 위해 업데이트
          } else {
            runningBalance -= change; // 역순이므로 빼기
            history.unshift({
              date: new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
              balance: Math.max(0, runningBalance), // 음수 방지
            });
          }
        }
        
        setBalanceHistory(history);
      }
    } catch (error: any) {
      console.error('자산 추이 데이터 로드 실패:', error);
      // 에러가 발생해도 그래프는 빈 데이터로 표시
      setBalanceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your custody wallet</p>
        </div>
        
        {/* MetaMask Connection Section */}
        <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {isConnected && address ? (
            <>
              <div className="glass rounded-lg px-4 py-2 text-sm font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectWallet}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                연결 해제
              </Button>
            </>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? '연결 중...' : 'MetaMask 연결'}
            </Button>
          )}
          
          {status && (
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {status}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="lg:col-span-2 card-hover animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Total Balance</CardTitle>
                <CardDescription>Omnibus Vault - Sepolia</CardDescription>
              </div>
              <div className="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-5xl font-bold text-gradient">
                  {loading ? '...' : parseFloat(balance).toFixed(10)} ETH
                </p>
                <p className="text-sm text-gray-500 mt-1">Sepolia Testnet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="gradient" 
              className="w-full justify-start"
              onClick={() => navigate('/deposit')}
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Deposit ETH
            </Button>
            
            <Button 
              variant="glass" 
              className="w-full justify-start"
              onClick={() => navigate('/withdraw/request')}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Withdraw ETH
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/withdraw/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => navigate('/activity')}
            >
              <ActivityIcon className="w-4 h-4 mr-2" />
              View Activity
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Daily Balance History Chart */}
      <Card className="animate-fade-in mt-8" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-blue rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>일일 자산 추이</CardTitle>
                <CardDescription>최근 {historyDays}일간의 잔액 변화</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={historyDays === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryDays(7)}
              >
                7일
              </Button>
              <Button
                variant={historyDays === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHistoryDays(30)}
              >
                30일
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">데이터를 불러오는 중...</p>
            </div>
          ) : balanceHistory.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">데이터가 없습니다.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={balanceHistory} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                  tickFormatter={(value) => {
                    if (value === 0) return '0 ETH';
                    // 값에 따라 적절한 소수점 자리수 표시
                    if (value >= 1) return `${value.toFixed(4)} ETH`;
                    if (value >= 0.1) return `${value.toFixed(6)} ETH`;
                    if (value >= 0.01) return `${value.toFixed(8)} ETH`;
                    return `${value.toFixed(10)} ETH`;
                  }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(10)} ETH`, '잔액']}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={{ fill: '#667eea', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="잔액 (ETH)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      {status === 'FROZEN' && (
        <Card className="border-red-300 bg-red-50 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-red-600 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900">Account Frozen</h3>
                <p className="text-sm text-red-700 mt-1">
                  Your account has been frozen. All withdrawal operations are restricted. 
                  Please contact support for assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
