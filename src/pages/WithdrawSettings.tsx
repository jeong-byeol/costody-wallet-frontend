import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAddress, getAddress } from 'viem';
import { ArrowLeft, Plus, Trash2, Shield, TrendingUp, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { settingsApi } from '@/lib/api';
import { useSessionStore, useUiStore } from '@/stores';

export function WithdrawSettings() {
  const navigate = useNavigate();
  const { userId } = useSessionStore();
  const addNotification = useUiStore((state) => state.addNotification);

  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 일일 출금 한도 관련 상태
  const [dailyLimit, setDailyLimit] = useState({
    maxEth: '0',
    spentEth: '0',
    remainingEth: null as string | null,
    isUnlimited: false,
    isNewDay: false,
  });
  const [newLimitInput, setNewLimitInput] = useState('');
  const [loadingLimit, setLoadingLimit] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // 화이트리스트 로드
      const whitelistResponse = await settingsApi.getWhitelist();
      const whitelistAddresses = whitelistResponse.data.map((item) => getAddress(item.to_address));
      setWhitelist(whitelistAddresses);
      
      // 일일 출금 한도 로드
      try {
        const limitResponse = await settingsApi.getDailyLimit();
        console.log('일일 출금 한도 응답:', limitResponse.data);
        console.log('spentEth:', limitResponse.data.spentEth);
        console.log('remainingEth:', limitResponse.data.remainingEth);
        setDailyLimit({
          maxEth: limitResponse.data.maxEth,
          spentEth: limitResponse.data.spentEth,
          remainingEth: limitResponse.data.remainingEth,
          isUnlimited: limitResponse.data.isUnlimited,
          isNewDay: limitResponse.data.isNewDay,
        });
        // 상태 업데이트 확인
        console.log('dailyLimit 상태 업데이트 완료');
      } catch (limitError: any) {
        console.error('일일 출금 한도 조회 실패:', limitError);
        // 한도 조회 실패는 치명적이지 않으므로 계속 진행
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '설정 로드 실패',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!userId) return;

    if (!newAddress) {
      addNotification({ type: 'error', message: '주소를 입력하세요.' });
      return;
    }

    if (!isAddress(newAddress)) {
      addNotification({ type: 'error', message: '유효하지 않은 주소입니다.' });
      return;
    }

    const checksumAddress = getAddress(newAddress);

    if (whitelist.includes(checksumAddress)) {
      addNotification({ type: 'warning', message: '이미 등록된 주소입니다.' });
      return;
    }

    try {
      setSaving(true);
      await settingsApi.registerWhitelist(checksumAddress);
      await loadSettings();
      setNewAddress('');
      addNotification({ type: 'success', message: '주소가 추가되었습니다.' });
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '주소 추가 실패',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAddress = async (address: string) => {
    try {
      setSaving(true);
      await settingsApi.removeWhitelist(address);
      await loadSettings();
      addNotification({ type: 'success', message: '주소가 제거되었습니다.' });
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '주소 제거 실패',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDailyLimit = async () => {
    if (!newLimitInput) {
      addNotification({ type: 'error', message: '한도를 입력하세요.' });
      return;
    }

    const limitNum = parseFloat(newLimitInput);
    if (isNaN(limitNum) || limitNum < 0) {
      addNotification({ type: 'error', message: '유효한 한도를 입력하세요. (0 이상)' });
      return;
    }

    try {
      setLoadingLimit(true);
      await settingsApi.setDailyLimit(limitNum);
      await loadSettings();
      setNewLimitInput('');
      addNotification({ 
        type: 'success', 
        message: limitNum === 0 
          ? '일일 출금 한도가 무제한으로 설정되었습니다.' 
          : `일일 출금 한도가 ${limitNum} ETH로 설정되었습니다.` 
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.error?.message || '한도 설정 실패',
      });
    } finally {
      setLoadingLimit(false);
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
          <h1 className="text-4xl font-bold text-gradient">Withdrawal Settings</h1>
          <p className="text-gray-600 mt-1">Manage whitelist and daily limits</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
        {/* Whitelist Card */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-purple rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Whitelist Addresses</CardTitle>
                <CardDescription>
                  {whitelist.length} address{whitelist.length !== 1 ? 'es' : ''} allowed
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add Address */}
            <div className="space-y-2">
              <Label htmlFor="newAddress">Add New Address</Label>
              <div className="flex gap-2">
                <Input
                  id="newAddress"
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  disabled={saving}
                />
                <Button
                  variant="gradient"
                  size="icon"
                  onClick={handleAddAddress}
                  disabled={saving || !newAddress}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Address List */}
            <div className="space-y-2">
              <Label>Allowed Addresses</Label>
              {whitelist.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No addresses whitelisted</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {whitelist.map((address) => (
                    <div
                      key={address}
                      className="flex items-center justify-between p-3 glass rounded-lg hover:bg-white/80 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-mono text-sm">
                          {address.slice(0, 10)}...{address.slice(-8)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAddress(address)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Limit Card */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-pink rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Daily Limit</CardTitle>
                <CardDescription>Set maximum withdrawal per day</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current Usage */}
            <div className="glass rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Spent Today</span>
                <span className="font-semibold">{parseFloat(dailyLimit.spentEth).toFixed(10)} ETH</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Daily Limit</span>
                <span className="font-semibold">
                  {dailyLimit.isUnlimited ? '무제한' : `${parseFloat(dailyLimit.maxEth).toFixed(10)} ETH`}
                </span>
              </div>

              {/* Progress Bar */}
              {!dailyLimit.isUnlimited && dailyLimit.remainingEth !== null && parseFloat(dailyLimit.maxEth) > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full gradient-purple transition-all duration-500"
                      style={{ 
                        width: `${Math.min(
                          (parseFloat(dailyLimit.spentEth) / parseFloat(dailyLimit.maxEth)) * 100,
                          100
                        )}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {((parseFloat(dailyLimit.spentEth) / parseFloat(dailyLimit.maxEth)) * 100).toFixed(2)}% used
                  </p>
                </div>
              )}

              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Remaining</span>
                <span className="font-bold text-gradient">
                  {dailyLimit.isUnlimited 
                    ? '무제한' 
                    : dailyLimit.remainingEth !== null 
                      ? `${parseFloat(dailyLimit.remainingEth).toFixed(10)} ETH`
                      : '0 ETH'}
                </span>
              </div>
            </div>

            {/* Update Limit */}
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">New Daily Limit (ETH)</Label>
              <Input
                id="dailyLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder={dailyLimit.isUnlimited ? "무제한 (0 입력)" : "1.0"}
                value={newLimitInput}
                onChange={(e) => setNewLimitInput(e.target.value)}
                disabled={loadingLimit || saving}
              />
              <p className="text-xs text-gray-500">
                일일 최대 출금 한도를 설정하세요. 0을 입력하면 무제한입니다.
              </p>
            </div>

            <Button
              variant="gradient"
              className="w-full"
              onClick={handleUpdateDailyLimit}
              disabled={loadingLimit || saving || !newLimitInput}
            >
              {loadingLimit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Daily Limit'
              )}
            </Button>

            {/* Warning */}
            <div className="glass-dark rounded-lg p-4">
              <p className="text-xs text-gray-300">
                ⚠️ <strong>Note:</strong> Changes to daily limits will be processed 
                on-chain. The transaction will be sponsored by the backend.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="max-w-4xl mx-auto border-blue-200 bg-blue-50 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardContent className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Security Information</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Whitelist ensures only approved addresses can receive withdrawals</li>
            <li>Daily limit provides additional spending protection</li>
            <li>All policy changes are recorded on-chain for transparency</li>
            <li>Changes may take a few minutes to reflect after blockchain confirmation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
