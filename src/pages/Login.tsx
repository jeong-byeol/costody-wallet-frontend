import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { Mail, Lock, Wallet, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { useSessionStore, useChainStore, useUiStore } from '@/stores';
import { SEPOLIA_CHAIN_ID } from '@/lib/wagmi';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const { address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  
  const setSession = useSessionStore((state) => state.setSession);
  const setChain = useChainStore((state) => state.setChain);
  const addNotification = useUiStore((state) => state.addNotification);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      addNotification({ type: 'error', message: '이메일과 비밀번호를 입력하세요.' });
      return;
    }

    setLoading(true);
    setShowResend(false);

    try {
      // 로그인
      const authData = await authApi.login(email, password);
      
      // 계정 동결 상태 확인 (대소문자 구분 없이)
      const userStatus = authData.user.status?.toUpperCase()?.trim() || '';
      
      if (userStatus === 'FROZEN') {
        addNotification({ 
          type: 'error', 
          message: '현재 계정이 동결되었습니다. 고객센터에 문의해주세요.' 
        });
        setLoading(false);
        return;
      }
      
      // 세션 저장
      setSession({
        accessToken: authData.access_token,
        userId: authData.user.id,
        email: authData.user.email,
        role: authData.user.role,
        status: (userStatus === 'FROZEN' ? 'FROZEN' : 'ACTIVE') as 'ACTIVE' | 'FROZEN',
      });
      
      addNotification({ type: 'success', message: '로그인 성공!' });
      
      // 지갑이 연결되어 있고 네트워크가 맞으면 대시보드로
      if (address && chainId === SEPOLIA_CHAIN_ID) {
        navigate('/dashboard');
      } else {
        // 지갑 미연결 시에도 대시보드로 (나중에 연결 가능)
        navigate('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      
      // 이메일 미인증 에러 체크
      if (errorMessage.includes('이메일 인증')) {
        setShowResend(true);
        addNotification({ 
          type: 'warning', 
          message: '이메일 인증이 필요합니다.' 
        });
      } else {
        addNotification({ type: 'error', message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      addNotification({ type: 'error', message: '이메일을 입력해주세요.' });
      return;
    }

    try {
      const response = await authApi.resendVerification(email);
      addNotification({ type: 'success', message: response.message });
      setShowResend(false);
    } catch (error: any) {
      const message = error.response?.data?.message || '재발송에 실패했습니다.';
      addNotification({ type: 'error', message });
    }
  };

  const handleConnectWallet = async () => {
    try {
      const metaMaskConnector = connectors.find((c) => c.id === 'injected');
      if (!metaMaskConnector) {
        addNotification({ type: 'error', message: 'MetaMask를 설치해주세요.' });
        return;
      }

      await connect({ connector: metaMaskConnector });
      
      // 체인 체크 및 스위치
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await switchChain({ chainId: SEPOLIA_CHAIN_ID });
        } catch (switchError) {
          addNotification({ 
            type: 'error', 
            message: 'Sepolia 네트워크로 전환해주세요.' 
          });
          return;
        }
      }

      if (address) {
        setChain({ address, chainId: SEPOLIA_CHAIN_ID });
        addNotification({ type: 'success', message: '지갑이 연결되었습니다.' });
        
        // 로그인되어 있으면 대시보드로
        const isAuth = useSessionStore.getState().isAuthenticated();
        if (isAuth) {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      addNotification({ 
        type: 'error', 
        message: error.message || '지갑 연결에 실패했습니다.' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 gradient-purple rounded-full blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 gradient-pink rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 gradient-blue rounded-full blur-3xl opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 relative z-10">
        {/* Left Side - Feature Cards */}
        <div className="hidden md:flex flex-col justify-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gradient">
              Secure Access for Your Custody Wallet
            </h1>
            <p className="text-gray-600 text-lg">
              Sepolia Testnet - Secure ETH Custody
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Feature Cards */}
            <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-6">
                <div className="w-12 h-12 gradient-purple rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Secure Login</h3>
                <p className="text-sm text-gray-600">
                  User-friendly authentication with glassmorphic designs.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-6">
                <div className="w-12 h-12 gradient-pink rounded-lg flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Wallet Connection</h3>
                <p className="text-sm text-gray-600">
                  Easily connect your MetaMask wallet securely.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-6">
                <div className="w-12 h-12 gradient-blue rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 rounded-full border-2 border-white neon-glow"></div>
                </div>
                <h3 className="font-semibold mb-2">Network Indicator</h3>
                <p className="text-sm text-gray-600">
                  Stay informed with real-time network status updates.
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <CardContent className="p-6">
                <div className="w-12 h-12 gradient-cyber rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Email Verification</h3>
                <p className="text-sm text-gray-600">
                  Secure account verification via email.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gradient">
                Welcome Back
              </CardTitle>
              <CardDescription>
                Sign in to access your custody wallet
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email Not Verified Warning */}
                {showResend && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 mb-2">
                          이메일 인증이 완료되지 않았습니다.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                        >
                          인증 이메일 재발송
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="gradient" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '로그인'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/70 px-2 text-gray-500">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="glass"
                className="w-full"
                onClick={handleConnectWallet}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect MetaMask
              </Button>

              {address && (
                <div className="text-center text-sm space-y-1">
                  <p className="text-gray-600">연결된 지갑:</p>
                  <p className="font-mono text-xs bg-gray-100 rounded px-2 py-1">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                  {chainId !== SEPOLIA_CHAIN_ID && (
                    <p className="text-red-500 text-xs">
                      ⚠️ Sepolia 네트워크로 전환해주세요
                    </p>
                  )}
                  {chainId === SEPOLIA_CHAIN_ID && (
                    <p className="text-green-500 text-xs flex items-center justify-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Sepolia Testnet
                    </p>
                  )}
                </div>
              )}

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  계정이 없으신가요? 회원가입
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
