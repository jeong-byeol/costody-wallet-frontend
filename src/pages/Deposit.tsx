import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, stringToHex } from 'viem';
import { ArrowLeft, ArrowDownCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSessionStore, useUiStore } from '@/stores';
import { SEPOLIA_CHAIN_ID } from '@/lib/wagmi';
import { txApi } from '@/lib/api';

// OmnibusVault ABI (depositETH function only)
const VAULT_ABI = [
  {
    inputs: [{ name: 'userKey', type: 'bytes32' }],
    name: 'depositETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

export function Deposit() {
  const navigate = useNavigate();
  const { address, chainId } = useAccount();
  const { email } = useSessionStore();
  const addNotification = useUiStore((state) => state.addNotification);

  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [reportStatus, setReportStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [reportMessage, setReportMessage] = useState('');

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleDeposit = async () => {
    if (!address) {
      addNotification({ type: 'error', message: '지갑을 먼저 연결해주세요.' });
      return;
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      addNotification({ type: 'error', message: 'Sepolia 네트워크로 전환해주세요.' });
      return;
    }

    if (!email) {
      addNotification({ type: 'error', message: '로그인 정보가 없습니다. 다시 로그인해주세요.' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addNotification({ type: 'error', message: '유효한 금액을 입력하세요.' });
      return;
    }

    if (amountNum > 79) {
      addNotification({ type: 'error', message: '금액은 79 ETH 이하여야 합니다.' });
      return;
    }

    try {
      setReportStatus('idle');
      setReportMessage('');
      // 이메일을 32바이트 Hex로 변환해 userKey 자리에 전달
      const emailAsBytes32 = stringToHex(email, { size: 32 });

      const hash = await writeContractAsync({
        address: import.meta.env.VITE_OMNIBUS_VAULT as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'depositETH',
        args: [emailAsBytes32],
        value: parseEther(amount),
      });

      setTxHash(hash);
      addNotification({ type: 'info', message: '트랜잭션이 전송되었습니다.' });
    } catch (error: any) {
      console.error('Deposit error:', error);
      addNotification({ 
        type: 'error', 
        message: error.message || '입금에 실패했습니다.' 
      });
    }
  };

  const reportDepositTx = useCallback(async () => {
    if (!txHash || reportStatus === 'pending') return;
    try {
      setReportStatus('pending');
      const response = await txApi.reportDeposit(txHash);
      setReportStatus('success');
      const successMessage = response.message || '입금 내역이 성공적으로 기록되었습니다.';
      setReportMessage(successMessage);
      addNotification({ type: 'success', message: successMessage });
    } catch (error: any) {
      console.error('Deposit report error:', error);
      setReportStatus('error');
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        '입금 기록 저장에 실패했습니다.';
      setReportMessage(errorMessage);
      addNotification({ type: 'error', message: errorMessage });
    }
  }, [txHash, reportStatus, addNotification]);

  useEffect(() => {
    if (isSuccess && txHash && reportStatus === 'idle') {
      reportDepositTx();
    }
  }, [isSuccess, txHash, reportStatus, reportDepositTx]);

  // 성공 시 처리
  if (isSuccess && txHash) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center animate-fade-in">
          <CardContent className="p-8 space-y-6">
            <div className="w-20 h-20 gradient-blue rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gradient mb-2">Deposit Successful!</h2>
              <p className="text-gray-600">
                Your deposit of {amount} ETH has been confirmed.
              </p>
            </div>

            <div className="glass rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">{amount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction:</span>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline font-mono text-xs"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                </a>
              </div>
            </div>

            <div className="glass rounded-lg p-4 space-y-3 text-left">
              <h4 className="text-sm font-semibold text-gray-700">백엔드 저장 상태</h4>
              {reportStatus === 'pending' && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  입금 기록을 저장 중입니다...
                </p>
              )}
              {reportStatus === 'success' && (
                <p className="text-sm text-green-600">{reportMessage || '입금 기록 저장 완료'}</p>
              )}
              {reportStatus === 'error' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">{reportMessage}</p>
                  <Button variant="outline" size="sm" onClick={reportDepositTx}>
                    다시 시도
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="glass"
                className="flex-1"
                onClick={() => {
                  setTxHash(undefined);
                  setAmount('');
                  setReportStatus('idle');
                  setReportMessage('');
                }}
              >
                Deposit More
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <h1 className="text-4xl font-bold text-gradient">Deposit ETH</h1>
          <p className="text-gray-600 mt-1">Add funds to your custody wallet</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Deposit Amount</CardTitle>
                <CardDescription>Enter the amount of ETH to deposit</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETH)</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.000001"
                  max="79"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-2xl font-semibold h-16 pr-16"
                  disabled={isWritePending || isConfirming}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                  ETH
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Maximum: 79 ETH per transaction
              </p>
            </div>

            {/* Info Card */}
            <div className="glass rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Transaction Details</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-medium">Sepolia Testnet</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract:</span>
                  <span className="font-mono text-xs">
                    {import.meta.env.VITE_OMNIBUS_VAULT?.slice(0, 6)}...
                    {import.meta.env.VITE_OMNIBUS_VAULT?.slice(-4)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Wallet:</span>
                  <span className="font-mono text-xs">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                  </span>
                </div>

                {amount && parseFloat(amount) > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-600">You will deposit:</span>
                    <span className="font-bold text-lg text-gradient">
                      {amount} ETH
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleDeposit}
              disabled={
                !address || 
                !amount || 
                parseFloat(amount) <= 0 || 
                isWritePending || 
                isConfirming
              }
            >
              {isWritePending || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isWritePending ? 'Confirm in Wallet...' : 'Confirming...'}
                </>
              ) : (
                <>
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Deposit ETH
                </>
              )}
            </Button>

            {/* Warning */}
            <div className="glass-dark rounded-lg p-4">
              <p className="text-xs text-gray-300">
                ⚠️ <strong>Security Notice:</strong> This transaction will be signed with your 
                MetaMask wallet. Make sure you're on the Sepolia testnet and the contract 
                address matches your records.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Status */}
        {txHash && (
          <Card className="mt-6 border-purple-300 bg-purple-50 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900">Transaction Pending</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Waiting for confirmation on the blockchain...
                  </p>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline mt-2 inline-block"
                  >
                    View on Etherscan →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
