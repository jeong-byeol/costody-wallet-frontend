import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { ArrowLeft, ArrowUpCircle, Lock, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { settingsApi, txApi } from '@/lib/api';
import { useSessionStore, useUiStore } from '@/stores';

const STATE_ICONS = {
  pending: Clock,
  auto_wait: Clock,
  manual_wait: Clock,
  executed: CheckCircle2,
  failed: XCircle,
};

const STATE_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  auto_wait: 'bg-blue-100 text-blue-700',
  manual_wait: 'bg-orange-100 text-orange-700',
  executed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export function WithdrawRequest() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { userId } = useSessionStore();
  const addNotification = useUiStore((state) => state.addNotification);

  const [step, setStep] = useState<'form' | 'processing' | 'result'>('form');
  const [processingStep, setProcessingStep] = useState<'submit' | 'approve' | 'execute'>('submit');
  const [to, setTo] = useState(address ?? '');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawalState, setWithdrawalState] = useState<{
    to: string;
    amountEth: string;
    state: 'submitted' | 'approved' | 'executed' | 'failed' | 'waiting_manager';
    submitTxHash?: string;
    approveTxHash?: string;
    executeTxHash?: string;
    txId?: string; // Manager 승인 대기 시 txId 저장
  } | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);

  const getErrorMessage = (error: any) => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error?.message ||
      error?.message ||
      '알 수 없는 오류가 발생했습니다.'
    );
  };

  useEffect(() => {
    if (address && !to) {
      setTo(address);
    }
  }, [address, to]);

  useEffect(() => {
    const loadWhitelist = async () => {
      if (!userId) return;
      try {
        const response = await settingsApi.getWhitelist();
        const addresses = response.data.map((item) => getAddress(item.to_address));
        setWhitelist(addresses);
      } catch (error) {
        console.error('Failed to load whitelist:', error);
      }
    };

    loadWhitelist();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !amount || !password) {
      addNotification({ type: 'error', message: '모든 필드를 입력하세요.' });
      return;
    }

    if (!isAddress(to)) {
      addNotification({ type: 'error', message: '유효하지 않은 주소입니다.' });
      return;
    }

    const checksumAddress = getAddress(to);
    
    // Check whitelist (if available)
    if (whitelist.length > 0 && !whitelist.includes(checksumAddress)) {
      addNotification({ 
        type: 'error', 
        message: '화이트리스트에 등록되지 않은 주소입니다.' 
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addNotification({ type: 'error', message: '유효한 금액을 입력하세요.' });
      return;
    }

    try {
      setLoading(true);
      setStep('processing');
      setProcessingStep('submit');

      // Step 1: Create intent
      const submitData = await txApi.withdrawSubmit({
        to: checksumAddress,
        amount,
        password,
      });

      const txId = submitData?.txId;
      if (!txId) {
        throw new Error('출금 트랜잭션 ID를 가져오지 못했습니다.');
      }
      addNotification({
        type: 'info',
        message: submitData?.txHash
          ? `출금 요청이 제출되었습니다. Tx: ${submitData.txHash.slice(0, 10)}...`
          : '출금 요청이 제출되었습니다.',
      });
      console.log('[Withdraw] Submit response:', submitData);

      // Step 2: Approve
      setProcessingStep('approve');
      let approveData;
      try {
        approveData = await txApi.withdrawApprove(txId);
        console.log('[Withdraw] Approve response:', approveData);
        
        // Manager 승인이 필요한 경우 (0.01 ETH 이상)
        if (approveData?.requiresManagerApproval) {
          addNotification({
            type: 'warning',
            message: '0.01 ETH 이상의 출금은 관리자 승인이 필요합니다. 승인 대기 중입니다.',
          });
          
          setWithdrawalState({
            to: checksumAddress,
            amountEth: amount,
            state: 'waiting_manager',
            submitTxHash: submitData?.txHash,
            approveTxHash: approveData?.txHash,
            txId: txId, // Manager 승인 대기 시 txId 저장
          });
          
          setStep('result');
          addNotification({
            type: 'info',
            message: 'TSS 승인이 완료되었습니다. 관리자 승인 후 출금이 진행됩니다.',
          });
          return; // Manager 승인 대기 상태로 종료
        }
        
        // 자동 승인 완료 (0.01 ETH 미만)
        addNotification({
          type: 'info',
          message: approveData?.txHash
            ? `출금 승인 완료. Tx: ${approveData.txHash.slice(0, 10)}...`
            : '출금 승인 완료.',
        });
      } catch (approveError: any) {
        const msg = getErrorMessage(approveError);
        console.error('Withdraw approve failed:', approveError);
        throw new Error(`출금 승인에 실패했습니다. ${msg}`);
      }

      // Step 3: Execute
      setProcessingStep('execute');
      let executeData;
      try {
        executeData = await txApi.withdrawExecute(txId);
        addNotification({
          type: 'info',
          message: executeData?.txHash
            ? `출금 실행 완료. Tx: ${executeData.txHash.slice(0, 10)}...`
            : '출금 실행 완료.',
        });
        console.log('[Withdraw] Execute response:', executeData);
      } catch (executeError: any) {
        const msg = getErrorMessage(executeError);
        console.error('Withdraw execute failed:', executeError);
        throw new Error(`출금 실행에 실패했습니다. ${msg}`);
      }

      setWithdrawalState({
        to: checksumAddress,
        amountEth: amount,
        state: 'executed',
        submitTxHash: submitData?.txHash,
        approveTxHash: approveData?.txHash,
        executeTxHash: executeData?.txHash,
      });

      setStep('result');
      addNotification({
        type: 'success',
        message: '출금 요청이 성공적으로 완료되었습니다.',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '출금 요청 실패',
      });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  // Result view
  if (step === 'result' && withdrawalState) {
    const isWaitingManager = withdrawalState.state === 'waiting_manager';
    const isExecuted = withdrawalState.state === 'executed';
    
    const StateIcon = STATE_ICONS[
      (isExecuted ? 'executed' : isWaitingManager ? 'manual_wait' : 'pending') as keyof typeof STATE_ICONS
    ];
    const stateColor = STATE_COLORS[
      (isExecuted ? 'executed' : isWaitingManager ? 'manual_wait' : 'pending') as keyof typeof STATE_COLORS
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full animate-fade-in">
          <CardContent className="p-8 space-y-6">
            <div className={`w-20 h-20 ${stateColor} rounded-full flex items-center justify-center mx-auto`}>
              <StateIcon className="w-10 h-10" />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-gradient mb-2">
                {isExecuted 
                  ? '출금 완료!' 
                  : isWaitingManager 
                    ? '고액 출금 서명 대기 중' 
                    : '출금 요청 제출됨'}
              </h2>
              <p className="text-gray-600">
                {isExecuted
                  ? '출금이 완전히 처리되었습니다.'
                  : isWaitingManager
                    ? '0.01 ETH 이상의 출금은 관리자 승인이 필요합니다. 관리자 승인 후 출금이 진행됩니다.'
                  : 'The withdrawal transaction was submitted successfully.'}
              </p>
            </div>

            <div className="glass rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-mono text-xs">
                  {withdrawalState.to.slice(0, 6)}...{withdrawalState.to.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{withdrawalState.amountEth} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${stateColor}`}>
                  {withdrawalState.state.toUpperCase()}
                </span>
              </div>
              {withdrawalState.submitTxHash && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Submit Tx:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${withdrawalState.submitTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-mono text-xs"
                  >
                    {withdrawalState.submitTxHash.slice(0, 6)}...{withdrawalState.submitTxHash.slice(-4)}
                  </a>
                </div>
              )}
              {withdrawalState.approveTxHash && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approve Tx:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${withdrawalState.approveTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-mono text-xs"
                  >
                    {withdrawalState.approveTxHash.slice(0, 6)}...{withdrawalState.approveTxHash.slice(-4)}
                  </a>
                </div>
              )}
              {withdrawalState.executeTxHash && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Execute Tx:</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${withdrawalState.executeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-mono text-xs"
                  >
                    {withdrawalState.executeTxHash.slice(0, 6)}...{withdrawalState.executeTxHash.slice(-4)}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="glass"
                className="flex-1"
                onClick={() => {
                  setStep('form');
                  setWithdrawalState(null);
                  setTo(address ?? '');
                  setAmount('');
                  setPassword('');
                }}
              >
                New Withdrawal
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing view
  if (step === 'processing') {
    const stepLabels = {
      submit: 'Submit',
      approve: 'Approve',
      execute: 'Execute',
    };

    const stepMessages = {
      submit: 'Submitting withdrawal request...',
      approve: 'Approving withdrawal request...',
      execute: 'Executing withdrawal request...',
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full animate-fade-in">
          <CardContent className="p-8 text-center space-y-6">
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gradient mb-2">
                {stepLabels[processingStep]}
              </h2>
              <p className="text-gray-600">
                {stepMessages[processingStep]}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form view
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
          <h1 className="text-4xl font-bold text-gradient">Withdraw Request</h1>
          <p className="text-gray-600 mt-1">Request a withdrawal from your custody wallet</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-pink rounded-xl flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Withdrawal Details</CardTitle>
                <CardDescription>Enter withdrawal information</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Address */}
              <div className="space-y-2">
                <Label htmlFor="to">Recipient Address</Label>
                <Input
                  id="to"
                  placeholder="0x..."
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500">
                  Must be a whitelisted address registered in Withdrawal Settings.
                </p>
                {whitelist.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Currently whitelisted addresses: {whitelist.length}
                  </p>
                )}
              </div>

              {/* Step 2: Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Step 3: Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password (Step-up Authentication)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Re-enter your password for security
                </p>
              </div>

              {/* Threshold Info */}
              <div className="glass-dark rounded-lg p-4">
                <p className="text-xs text-gray-300">
                  💡 <strong>Auto/Manual Approval:</strong> Withdrawals ≤0.01 ETH are auto-approved.
                  Larger amounts require manual admin approval.
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={loading || !to || !amount || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Request Withdrawal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
