import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore, useUiStore } from '@/stores';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wallet, Users, Activity, Loader2, Lock, Unlock, Search, X, Shield, ShieldOff, ArrowRight, ArrowDownCircle, ArrowUpCircle, ChevronUp, ChevronDown, Clock, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'FROZEN';
  balance: string;
  balanceEth: string;
  createdAt: string;
}

interface DepositWithdrawTransaction {
  type: 'DEPOSIT' | 'WITHDRAW';
  email: string | null;
  from?: string;
  to?: string;
  amount: string;
  timestamp: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { userId, role } = useSessionStore();
  const addNotification = useUiStore((state) => state.addNotification);

  const [loading, setLoading] = useState(true);
  const [omnibusBalance, setOmnibusBalance] = useState('0');
  const [coldBalance, setColdBalance] = useState('0');
  const [omnibusPaused, setOmnibusPaused] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<DepositWithdrawTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<DepositWithdrawTransaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [pausingOmnibus, setPausingOmnibus] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
  
  // 사용자 출금 승인 대기 목록
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Array<{
    txId: string;
    email: string | null;
    to: string;
    amount: string;
    amountEth: string;
    approvedTss: boolean;
    approvedManager: boolean;
    executed: boolean;
    requiresManagerApproval: boolean;
  }>>([]);
  const [approvingWithdrawal, setApprovingWithdrawal] = useState<string | null>(null);
  
  // Cold Vault 관련 상태
  const [coldDepositAmount, setColdDepositAmount] = useState('');
  const [coldDepositing, setColdDepositing] = useState(false);
  const [coldMoveAmount, setColdMoveAmount] = useState('');
  const [coldMoveStep, setColdMoveStep] = useState<'idle' | 'request' | 'approve' | 'execute'>('idle');
  const [coldMoveId, setColdMoveId] = useState<string | null>(null);
  const [coldMoving, setColdMoving] = useState(false);

  useEffect(() => {
    // 관리자 권한 확인
    const isAdmin = role?.toLowerCase() === 'admin';
    
    if (!isAdmin) {
      addNotification({ type: 'error', message: '관리자 권한이 필요합니다.' });
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [role, navigate, addNotification]);

  // 필터링 로직
  useEffect(() => {
    let filtered = [...allTransactions];

    // 타입 필터
    if (filterType !== 'ALL') {
      filtered = filtered.filter((tx) => tx.type === filterType);
    }

    // 이메일 검색 필터
    if (searchEmail.trim()) {
      const searchLower = searchEmail.toLowerCase().trim();
      filtered = filtered.filter((tx) => 
        tx.email?.toLowerCase().includes(searchLower)
      );
    }

    setTransactions(filtered);
  }, [allTransactions, filterType, searchEmail]);

  const loadData = async () => {
    const isAdmin = role?.toLowerCase() === 'admin';
    if (!userId || !isAdmin) return;

    try {
      setLoading(true);

      // 모든 데이터 병렬 로드
      const [omnibusRes, coldRes, pausedRes, usersRes, transactionsRes, withdrawalsRes] = await Promise.all([
        adminApi.getOmnibusBalance().catch(() => ({ data: { balanceEth: '0' } })),
        adminApi.getColdBalance().catch(() => ({ data: { balanceEth: '0' } })),
        adminApi.getOmnibusPausedStatus().catch(() => ({ data: { paused: false, status: 'ACTIVE' } })),
        adminApi.getAllUsers().catch(() => ({ data: [] })),
        adminApi.getDepositWithdrawTransactions(100).catch(() => ({ data: { total: 0, limit: 100, transactions: [] } })),
        adminApi.getPendingWithdrawals(50).catch(() => ({ data: { total: 0, requests: [] } })),
      ]);

      setOmnibusBalance(omnibusRes.data.balanceEth || '0');
      setColdBalance(coldRes.data.balanceEth || '0');
      setOmnibusPaused(pausedRes.data.paused);
      setUsers(usersRes.data || []);
      const loadedTransactions = transactionsRes.data.transactions || [];
      setAllTransactions(loadedTransactions);
      setTransactions(loadedTransactions);
      setTransactionsTotal(transactionsRes.data.total || 0);
      setPendingWithdrawals(withdrawalsRes.data.requests || []);
    } catch (error: any) {
      console.error('데이터 로드 실패:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '데이터를 불러오는데 실패했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!userId || role !== 'admin') return;

    const newStatus = user.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    const action = newStatus === 'FROZEN' ? '동결' : '해제';

    if (!confirm(`정말로 ${user.email} 사용자를 ${action}하시겠습니까?`)) {
      return;
    }

    try {
      setUpdatingUser(user.id);
      await adminApi.updateUserStatus(user.id, newStatus);
      addNotification({
        type: 'success',
        message: `사용자가 ${action}되었습니다.`,
      });
      // 사용자 목록 새로고침
      await loadData();
    } catch (error: any) {
      console.error('사용자 상태 변경 실패:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '사용자 상태 변경에 실패했습니다.',
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const handlePauseOmnibus = async (paused: boolean) => {
    if (!userId || role?.toLowerCase() !== 'admin') return;

    const action = paused ? '동결' : '해제';
    const confirmMessage = paused
      ? '정말로 Omnibus 지갑을 동결하시겠습니까? 동결 시 모든 입출금이 중단됩니다.'
      : '정말로 Omnibus 지갑을 해제하시겠습니까?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setPausingOmnibus(true);
      const result = await adminApi.pauseOmnibus(paused);
      
      addNotification({
        type: 'success',
        message: result.data.message,
      });

      if (result.data.txHash) {
        addNotification({
          type: 'info',
          message: `트랜잭션 해시: ${result.data.txHash.slice(0, 10)}...${result.data.txHash.slice(-8)}`,
        });
      }

      // 상태 새로고침
      await loadData();
    } catch (error: any) {
      console.error('Omnibus 동결/해제 실패:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || `Omnibus 지갑 ${action}에 실패했습니다.`,
      });
    } finally {
      setPausingOmnibus(false);
    }
  };

  // Cold Vault 입금 핸들러
  const handleColdDeposit = async () => {
    if (!coldDepositAmount || parseFloat(coldDepositAmount) <= 0) {
      addNotification({ type: 'error', message: '유효한 금액을 입력하세요.' });
      return;
    }

    if (!confirm(`정말로 Cold Vault에 ${coldDepositAmount} ETH를 입금하시겠습니까?`)) {
      return;
    }

    try {
      setColdDepositing(true);
      const result = await adminApi.coldDeposit(coldDepositAmount);
      
      addNotification({
        type: 'success',
        message: `Cold Vault 입금이 완료되었습니다. (${coldDepositAmount} ETH)`,
      });

      if (result.data.txHash) {
        addNotification({
          type: 'info',
          message: `트랜잭션 해시: ${result.data.txHash.slice(0, 10)}...${result.data.txHash.slice(-8)}`,
        });
      }

      setColdDepositAmount('');
      await loadData();
    } catch (error: any) {
      console.error('Cold Vault 입금 실패:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || 'Cold Vault 입금에 실패했습니다.',
      });
    } finally {
      setColdDepositing(false);
    }
  };

  // Cold Vault 이동 요청 핸들러
  const handleColdRequestMove = async () => {
    console.log('[Cold Move] 요청 시작:', { amount: coldMoveAmount });
    
    if (!coldMoveAmount || parseFloat(coldMoveAmount) <= 0) {
      console.log('[Cold Move] 유효하지 않은 금액');
      addNotification({ type: 'error', message: '유효한 금액을 입력하세요.' });
      return;
    }

    if (!confirm(`정말로 Cold Vault에서 Omnibus로 ${coldMoveAmount} ETH를 이동 요청하시겠습니까?`)) {
      console.log('[Cold Move] 사용자가 취소');
      return;
    }

    try {
      console.log('[Cold Move] Step 1: 상태 설정 (request)');
      setColdMoving(true);
      setColdMoveStep('request');
      
      console.log('[Cold Move] Step 2: API 호출 시작 - coldRequestMove');
      const result = await adminApi.coldRequestMove(coldMoveAmount);
      console.log('[Cold Move] Step 3: API 응답 받음:', result);
      
      console.log('[Cold Move] Step 4: Move ID 설정:', result.data.moveId);
      setColdMoveId(result.data.moveId);
      
      console.log('[Cold Move] Step 5: Step을 approve로 변경');
      setColdMoveStep('approve');
      setColdMoving(false); // 요청 완료 후 로딩 해제
      
      addNotification({
        type: 'success',
        message: `이동 요청이 생성되었습니다. Move ID: ${result.data.moveId.slice(0, 10)}...`,
      });
      console.log('[Cold Move] 요청 완료');
    } catch (error: any) {
      console.error('[Cold Move] 요청 실패:', error);
      console.error('[Cold Move] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || error.response?.data?.message || '이동 요청에 실패했습니다.',
      });
      setColdMoveStep('idle');
      setColdMoving(false);
    }
  };

  // Cold Vault 이동 승인 핸들러
  const handleColdApproveMove = async () => {
    console.log('[Cold Approve] 승인 시작:', { moveId: coldMoveId });
    
    if (!coldMoveId) {
      console.log('[Cold Approve] Move ID 없음');
      addNotification({ type: 'error', message: 'Move ID가 없습니다.' });
      return;
    }

    if (!confirm('이동 요청을 승인하시겠습니까?')) {
      console.log('[Cold Approve] 사용자가 취소');
      return;
    }

    try {
      console.log('[Cold Approve] Step 1: 상태 설정 (approve, loading=true)');
      setColdMoving(true);
      setColdMoveStep('approve');
      
      console.log('[Cold Approve] Step 2: API 호출 시작 - coldApproveMove');
      const result = await adminApi.coldApproveMove(coldMoveId);
      console.log('[Cold Approve] Step 3: API 응답 받음:', result);
      console.log('[Cold Approve] Step 4: 승인 상태 확인:', {
        approvedAdmin1: result.data.approvedAdmin1,
        approvedAdmin2: result.data.approvedAdmin2,
        isExecutable: result.data.isExecutable,
      });
      
      if (result.data.isExecutable) {
        console.log('[Cold Approve] Step 5: 실행 가능 상태 - step을 execute로 변경');
        setColdMoveStep('execute');
        setColdMoving(false); // 승인 완료 후 로딩 해제
        addNotification({
          type: 'success',
          message: '승인이 완료되었습니다. 이제 실행할 수 있습니다.',
        });
      } else {
        console.log('[Cold Approve] Step 5: 추가 승인 필요 - step은 approve 유지');
        setColdMoving(false); // 로딩 해제
        addNotification({
          type: 'info',
          message: `승인 완료. (${result.data.approvedAdmin1 && result.data.approvedAdmin2 ? '2/2' : '1/2'})`,
        });
      }
      console.log('[Cold Approve] 승인 완료');
    } catch (error: any) {
      console.error('[Cold Approve] 승인 실패:', error);
      console.error('[Cold Approve] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || error.response?.data?.message || '승인에 실패했습니다.',
      });
      setColdMoving(false); // 에러 발생 시 로딩 해제
    }
  };

  // Cold Vault 이동 실행 핸들러
  const handleColdExecuteMove = async () => {
    console.log('[Cold Execute] 실행 시작:', { moveId: coldMoveId });
    
    if (!coldMoveId) {
      console.log('[Cold Execute] Move ID 없음');
      addNotification({ type: 'error', message: 'Move ID가 없습니다.' });
      return;
    }

    if (!confirm('정말로 이동을 실행하시겠습니까?')) {
      console.log('[Cold Execute] 사용자가 취소');
      return;
    }

    try {
      console.log('[Cold Execute] Step 1: 상태 설정 (execute, loading=true)');
      setColdMoving(true);
      setColdMoveStep('execute');
      
      console.log('[Cold Execute] Step 2: API 호출 시작 - coldExecuteMove');
      const result = await adminApi.coldExecuteMove(coldMoveId);
      console.log('[Cold Execute] Step 3: API 응답 받음:', result);
      
      addNotification({
        type: 'success',
        message: `이동이 실행되었습니다. (${result.data.amountEth} ETH)`,
      });

      if (result.data.txHash) {
        console.log('[Cold Execute] Step 4: 트랜잭션 해시:', result.data.txHash);
        addNotification({
          type: 'info',
          message: `트랜잭션 해시: ${result.data.txHash.slice(0, 10)}...${result.data.txHash.slice(-8)}`,
        });
      }

      console.log('[Cold Execute] Step 5: 상태 초기화 및 데이터 새로고침');
      // 초기화
      setColdMoveAmount('');
      setColdMoveId(null);
      setColdMoveStep('idle');
      setColdMoving(false); // 실행 완료 후 로딩 해제
      
      console.log('[Cold Execute] Step 6: 데이터 새로고침 시작');
      await loadData();
      console.log('[Cold Execute] 실행 완료');
    } catch (error: any) {
      console.error('[Cold Execute] 실행 실패:', error);
      console.error('[Cold Execute] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || error.response?.data?.message || '실행에 실패했습니다.',
      });
      setColdMoving(false); // 에러 발생 시 로딩 해제
    }
  };

  // 사용자 출금 승인 핸들러
  const handleApproveUserWithdrawal = async (txId: string) => {
    if (!confirm('이 출금 요청을 승인하시겠습니까? 승인 후 출금이 실행됩니다.')) {
      return;
    }

    try {
      setApprovingWithdrawal(txId);
      
      // Step 1: Manager 승인
      console.log('[Admin Withdrawal] Step 1: Manager 승인 시작');
      const approveResult = await adminApi.approveUserWithdrawal(txId);
      console.log('[Admin Withdrawal] Step 2: Manager 승인 완료:', approveResult);
      
      addNotification({
        type: 'success',
        message: `출금 요청이 승인되었습니다. (${approveResult.data.amountEth} ETH)`,
      });

      if (approveResult.data.txHash) {
        addNotification({
          type: 'info',
          message: `승인 트랜잭션 해시: ${approveResult.data.txHash.slice(0, 10)}...${approveResult.data.txHash.slice(-8)}`,
        });
      }

      // Step 2: Execute (출금 실행)
      console.log('[Admin Withdrawal] Step 3: 출금 실행 시작 (관리자 전용 API)');
      try {
        const executeResult = await adminApi.executeUserWithdrawal(txId);
        console.log('[Admin Withdrawal] Step 4: 출금 실행 완료:', executeResult);
        
        addNotification({
          type: 'success',
          message: `출금이 실행되었습니다. (${executeResult.data.amountEth} ETH)`,
        });

        if (executeResult.data.txHash) {
          addNotification({
            type: 'info',
            message: `실행 트랜잭션 해시: ${executeResult.data.txHash.slice(0, 10)}...${executeResult.data.txHash.slice(-8)}`,
          });
        }

        if (executeResult.data.newBalance) {
          console.log('[Admin Withdrawal] 사용자 새 잔액:', executeResult.data.newBalance);
        }
      } catch (executeError: any) {
        console.error('[Admin Withdrawal] 출금 실행 실패:', executeError);
        addNotification({
          type: 'error',
          message: executeError.response?.data?.error?.message || executeError.response?.data?.message || '출금 실행에 실패했습니다. 승인은 완료되었습니다.',
        });
      }

      // 목록 새로고침
      await loadData();
    } catch (error: any) {
      console.error('출금 승인 실패:', error);
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || error.response?.data?.message || '출금 승인에 실패했습니다.',
      });
    } finally {
      setApprovingWithdrawal(null);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-gradient">관리자 대시보드</h1>
          <p className="text-gray-600 mt-1">시스템 관리 및 모니터링</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Omnibus 잔액</CardTitle>
                  <CardDescription>전체 사용자 자금 합계</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gradient">
                {parseFloat(omnibusBalance).toFixed(10)} ETH
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-pink rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Cold 잔액</CardTitle>
                  <CardDescription>콜드 월렛 잔액</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gradient">
                {parseFloat(coldBalance).toFixed(10)} ETH
              </p>
            </CardContent>
          </Card>

          {/* Omnibus 지갑 상태 */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  omnibusPaused ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {omnibusPaused ? (
                    <ShieldOff className="w-6 h-6 text-red-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div>
                  <CardTitle>Omnibus 지갑 상태</CardTitle>
                  <CardDescription>지갑 동결/활성화 관리</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">현재 상태</p>
                  <Badge
                    variant={omnibusPaused ? 'destructive' : 'default'}
                    className="text-base px-3 py-1"
                  >
                    {omnibusPaused === null ? '로딩 중...' : omnibusPaused ? '동결됨' : '활성화'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={omnibusPaused ? 'outline' : 'destructive'}
                  size="sm"
                  onClick={() => handlePauseOmnibus(true)}
                  disabled={pausingOmnibus || omnibusPaused === null || omnibusPaused === true}
                  className="flex-1"
                >
                  {pausingOmnibus ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      동결
                    </>
                  )}
                </Button>
                <Button
                  variant={!omnibusPaused ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handlePauseOmnibus(false)}
                  disabled={pausingOmnibus || omnibusPaused === null || omnibusPaused === false}
                  className="flex-1"
                >
                  {pausingOmnibus ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      해제
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cold Vault Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cold Vault 입금 */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-blue rounded-xl flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Cold Vault 입금</CardTitle>
                  <CardDescription>Cold Vault에 ETH 입금</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="coldDepositAmount" className="mb-2 block">
                  입금 금액 (ETH)
                </Label>
                <div className="relative">
                  <Input
                    id="coldDepositAmount"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="0.0"
                    value={coldDepositAmount}
                    onChange={(e) => setColdDepositAmount(e.target.value)}
                    disabled={coldDepositing}
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        const current = parseFloat(coldDepositAmount || '0');
                        const newValue = (current + 0.000001).toFixed(6);
                        setColdDepositAmount(parseFloat(newValue).toString());
                      }}
                      disabled={coldDepositing}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        const current = parseFloat(coldDepositAmount || '0');
                        const newValue = Math.max(0, current - 0.000001).toFixed(6);
                        setColdDepositAmount(parseFloat(newValue).toString());
                      }}
                      disabled={coldDepositing}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                variant="gradient"
                className="w-full"
                onClick={handleColdDeposit}
                disabled={coldDepositing || !coldDepositAmount}
              >
                {coldDepositing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    입금 중...
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    입금
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Cold Vault -> Omnibus 이동 */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-pink rounded-xl flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Cold → Omnibus 이동</CardTitle>
                  <CardDescription>Cold Vault에서 Omnibus로 자금 이동</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {coldMoveStep === 'idle' && (
                <>
                  <div>
                    <Label htmlFor="coldMoveAmount" className="mb-2 block">
                      이동 금액 (ETH)
                    </Label>
                    <div className="relative">
                      <Input
                        id="coldMoveAmount"
                        type="number"
                        step="0.000001"
                        min="0"
                        placeholder="0.0"
                        value={coldMoveAmount}
                        onChange={(e) => setColdMoveAmount(e.target.value)}
                        disabled={coldMoving}
                        className="pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            const current = parseFloat(coldMoveAmount || '0');
                            const newValue = (current + 0.000001).toFixed(6);
                            setColdMoveAmount(parseFloat(newValue).toString());
                          }}
                          disabled={coldMoving}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0"
                          onClick={() => {
                            const current = parseFloat(coldMoveAmount || '0');
                            const newValue = Math.max(0, current - 0.000001).toFixed(6);
                            setColdMoveAmount(parseFloat(newValue).toString());
                          }}
                          disabled={coldMoving}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={handleColdRequestMove}
                    disabled={coldMoving || !coldMoveAmount}
                  >
                    {coldMoving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        요청 중...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        이동 요청
                      </>
                    )}
                  </Button>
                </>
              )}

              {coldMoveStep === 'approve' && (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-semibold mb-2">이동 요청 정보</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      금액: {coldMoveAmount} ETH
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      Move ID: {coldMoveId}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleColdApproveMove}
                    disabled={coldMoving}
                  >
                    {coldMoving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        승인 중...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        승인
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setColdMoveStep('idle');
                      setColdMoveId(null);
                      setColdMoveAmount('');
                    }}
                    disabled={coldMoving}
                  >
                    취소
                  </Button>
                </>
              )}

              {coldMoveStep === 'execute' && (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-semibold mb-2">승인 완료</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      금액: {coldMoveAmount} ETH
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      Move ID: {coldMoveId}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      ✓ 2/2 승인 완료 - 실행 가능
                    </p>
                  </div>
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={handleColdExecuteMove}
                    disabled={coldMoving}
                  >
                    {coldMoving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        실행 중...
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        실행
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setColdMoveStep('idle');
                      setColdMoveId(null);
                      setColdMoveAmount('');
                    }}
                    disabled={coldMoving}
                  >
                    취소
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 사용자 출금 승인 대기 목록 */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-orange rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>출금 승인 대기</CardTitle>
                <CardDescription>
                  관리자 승인이 필요한 출금 요청 ({pendingWithdrawals.length}건)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingWithdrawals.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">승인 대기 중인 출금 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWithdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.txId}
                    className="glass rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">
                          {withdrawal.email || '이메일 없음'}
                        </Badge>
                        <Badge variant="default">
                          {parseFloat(withdrawal.amountEth).toFixed(10)} ETH
                        </Badge>
                        <Badge
                          variant={withdrawal.approvedTss ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          TSS: {withdrawal.approvedTss ? '승인됨' : '대기'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p className="font-mono text-xs">
                          To: {withdrawal.to.slice(0, 10)}...{withdrawal.to.slice(-8)}
                        </p>
                        <p className="font-mono text-xs">
                          Tx ID: {withdrawal.txId.slice(0, 10)}...{withdrawal.txId.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => handleApproveUserWithdrawal(withdrawal.txId)}
                      disabled={approvingWithdrawal === withdrawal.txId || !withdrawal.approvedTss}
                    >
                      {approvingWithdrawal === withdrawal.txId ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          승인 중...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Manager 승인
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-blue rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>사용자 관리</CardTitle>
                  <CardDescription>전체 사용자 목록 및 상태 관리</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-semibold">이메일</th>
                    <th className="text-left p-3 text-sm font-semibold">역할</th>
                    <th className="text-left p-3 text-sm font-semibold">상태</th>
                    <th className="text-right p-3 text-sm font-semibold">잔액 (ETH)</th>
                    <th className="text-left p-3 text-sm font-semibold">가입일</th>
                    <th className="text-center p-3 text-sm font-semibold">동작</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        사용자가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3">
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-sm font-mono">
                          {parseFloat(user.balanceEth).toFixed(10)}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={updatingUser === user.id}
                          >
                            {updatingUser === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : user.status === 'ACTIVE' ? (
                              <>
                                <Lock className="w-4 h-4 mr-1" />
                                동결
                              </>
                            ) : (
                              <>
                                <Unlock className="w-4 h-4 mr-1" />
                                해제
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Deposit/Withdraw Transactions */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-green rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Omnibus 입출금 기록</CardTitle>
                  <CardDescription>
                    WebSocket을 통해 자동으로 저장된 입출금 이벤트
                    {searchEmail || filterType !== 'ALL' ? (
                      <span className="ml-2">(필터링: {transactions.length}건 / 전체: {transactionsTotal}건)</span>
                    ) : (
                      <span className="ml-2">(전체: {transactionsTotal}건, 표시: {transactions.length}건)</span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 검색 및 필터 */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* 이메일 검색 */}
                <div className="flex-1">
                  <Label htmlFor="searchEmail" className="text-sm mb-2 block">
                    이메일 검색
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="searchEmail"
                      type="text"
                      placeholder="이메일로 검색..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchEmail && (
                      <button
                        onClick={() => setSearchEmail('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 타입 필터 */}
                <div className="sm:w-48">
                  <Label className="text-sm mb-2 block">타입 필터</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === 'ALL' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('ALL')}
                      className="flex-1"
                    >
                      전체
                    </Button>
                    <Button
                      variant={filterType === 'DEPOSIT' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('DEPOSIT')}
                      className="flex-1"
                    >
                      입금
                    </Button>
                    <Button
                      variant={filterType === 'WITHDRAW' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('WITHDRAW')}
                      className="flex-1"
                    >
                      출금
                    </Button>
                  </div>
                </div>
              </div>

              {/* 필터 결과 표시 */}
              {(searchEmail || filterType !== 'ALL') && (
                <div className="text-sm text-gray-600">
                  검색 결과: {transactions.length}건
                  {searchEmail && (
                    <span className="ml-2">
                      (이메일: "{searchEmail}")
                    </span>
                  )}
                  {filterType !== 'ALL' && (
                    <span className="ml-2">
                      (타입: {filterType === 'DEPOSIT' ? '입금' : '출금'})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center p-8 text-gray-500">
                  {allTransactions.length === 0
                    ? '입출금 기록이 없습니다.'
                    : '검색 결과가 없습니다.'}
                </p>
              ) : (
                transactions.map((tx, index) => (
                  <div
                    key={`${tx.timestamp}-${index}`}
                    className="glass rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Badge
                        variant={tx.type === 'DEPOSIT' ? 'default' : 'destructive'}
                      >
                        {tx.type === 'DEPOSIT' ? '입금' : '출금'}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {parseFloat(tx.amount).toFixed(10)} ETH
                          </p>
                          {tx.email && (
                            <Badge variant="outline" className="text-xs">
                              {tx.email}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          {tx.type === 'DEPOSIT' && tx.from && (
                            <span className="font-mono">From: {tx.from.slice(0, 10)}...{tx.from.slice(-8)}</span>
                          )}
                          {tx.type === 'WITHDRAW' && tx.to && (
                            <span className="font-mono">To: {tx.to.slice(0, 10)}...{tx.to.slice(-8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{new Date(tx.timestamp).toLocaleString('ko-KR')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

