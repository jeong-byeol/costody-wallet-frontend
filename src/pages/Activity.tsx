import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Shield, Filter, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { txApi } from '@/lib/api';
import { useUiStore } from '@/stores';

type FilterType = 'all' | 'IN' | 'OUT';

export function Activity() {
  const navigate = useNavigate();
  const addNotification = useUiStore((state) => state.addNotification);

  const [filter, setFilter] = useState<FilterType>('all');
  const [transactions, setTransactions] = useState<
    Array<{
      txHash: string;
      direction: 'IN' | 'OUT';
      status: string;
      amount: string;
      createdAt: string | null;
      from: string;
      to: string;
      blockNumber: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const direction = filter === 'all' ? undefined : filter;
        const history = await txApi.getHistory(direction);
        setTransactions(history);
      } catch (error: any) {
        const message =
          error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          '활동 내역을 불러오지 못했습니다.';
        addNotification({ type: 'error', message });
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [filter, addNotification]);

  const filterOptions = useMemo(
    () => [
      { value: 'all' as FilterType, label: '전체' },
      { value: 'IN' as FilterType, label: '입금 (IN)' },
      { value: 'OUT' as FilterType, label: '출금 (OUT)' },
    ],
    []
  );

  const formatAmount = (amountWei: string) => {
    try {
      const ethValue = formatEther(BigInt(amountWei));
      return `${Number(ethValue).toFixed(10)} ETH`;
    } catch {
      return `${amountWei} wei`;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Timestamp N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-4 animate-fade-in">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gradient">Activity History</h1>
          <p className="text-gray-600 mt-1">On-chain 입출금 기록을 한눈에 확인하세요</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter
            </CardTitle>
            <CardDescription>입금/출금 유형별로 내역을 필터링할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  {filter === 'all'
                    ? '전체 입출금 내역'
                    : filter === 'IN'
                      ? '입금 내역 (IN)'
                      : '출금 내역 (OUT)'}
                </CardDescription>
              </div>
              <p className="text-sm text-gray-500">{transactions.length} entries</p>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-semibold">트랜잭션이 없습니다.</p>
                <p className="text-sm mt-2 text-gray-600">첫 입금이나 출금을 진행해보세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => {
                  const isDeposit = tx.direction === 'IN';
                  const Icon = isDeposit ? ArrowDownCircle : ArrowUpCircle;
                  const statusColor =
                    tx.status === 'success'
                      ? 'text-green-600 bg-green-100'
                      : tx.status === 'pending'
                        ? 'text-yellow-600 bg-yellow-100'
                        : 'text-red-600 bg-red-100';

                  return (
                    <div
                      key={`${tx.txHash}-${index}`}
                      className="flex items-center justify-between p-4 glass rounded-lg hover:bg-white/80 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isDeposit ? 'gradient-blue' : 'gradient-pink'
                          }`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-lg">
                            {isDeposit ? '+' : '-'}
                            {formatAmount(tx.amount)}
                          </p>
                          <p className="text-xs text-gray-500 font-mono truncate">
                            Tx: {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                          <p className="text-xs text-gray-500">
                            From {tx.from.slice(0, 6)}...{tx.from.slice(-4)} → To {tx.to.slice(0, 6)}...
                            {tx.to.slice(-4)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {tx.status.toUpperCase()}
                        </span>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
