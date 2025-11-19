import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api';
import { useSessionStore, useUiStore } from '@/stores';

type VerificationState = 'verifying' | 'success' | 'error';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const addNotification = useUiStore((state) => state.addNotification);

  const [state, setState] = useState<VerificationState>('verifying');
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...');

  useEffect(() => {
    const verifyEmail = async () => {
      // 🔴 중요: searchParams가 null일 수 있으므로 안전하게 처리
      let token: string | null = null;
      
      try {
        token = searchParams?.get('token') || null;
      } catch (error) {
        console.error('searchParams 접근 오류:', error);
      }

      // 토큰이 없거나 null이면 에러
      if (!token) {
        setState('error');
        setMessage('유효하지 않은 인증 링크입니다.');
        addNotification({
          type: 'error',
          message: '인증 토큰을 찾을 수 없습니다.',
        });
        return;
      }

      try {
        // 1. 이메일 인증 (자동 로그인 포함)
        const response = await authApi.verifyEmail(token);
        
        // 2. 계정 동결 상태 확인 (대소문자 구분 없이)
        const userStatus = response.user.status?.toUpperCase()?.trim() || '';
        
        if (userStatus === 'FROZEN') {
          setState('error');
          setMessage('현재 계정이 동결되었습니다. 고객센터에 문의해주세요.');
          addNotification({ 
            type: 'error', 
            message: '현재 계정이 동결되었습니다. 고객센터에 문의해주세요.' 
          });
          return;
        }
        
        // 3. 세션 저장
        setSession({
          accessToken: response.access_token,
          userId: response.user.id,
          email: response.user.email,
          role: response.user.role,
          status: (response.user.status?.toUpperCase() === 'FROZEN' ? 'FROZEN' : 'ACTIVE') as 'ACTIVE' | 'FROZEN',
        });

        // 4. 성공 상태
        setState('success');
        setMessage('이메일 인증이 완료되었습니다!');
        
        addNotification({ 
          type: 'success', 
          message: response.message 
        });

        // 5. 3초 후 대시보드로 이동
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } catch (error: any) {
        setState('error');
        const errorMessage = error.response?.data?.message || '이메일 인증에 실패했습니다.';
        setMessage(errorMessage);
        addNotification({ type: 'error', message: errorMessage });
      }
    };

    verifyEmail();
  }, [searchParams, navigate, setSession, addNotification]);

  const getIcon = () => {
    switch (state) {
      case 'verifying':
        return <Loader2 className="w-16 h-16 animate-spin text-purple-600" />;
      case 'success':
        return (
          <div className="w-20 h-20 gradient-blue rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        );
      case 'error':
        return (
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (state) {
      case 'verifying':
        return '인증 처리 중...';
      case 'success':
        return '인증 완료!';
      case 'error':
        return '인증 실패';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 gradient-purple rounded-full blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 gradient-pink rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="max-w-md w-full relative z-10 animate-fade-in">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {getIcon()}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gradient">
            {getTitle()}
          </h2>

          {/* Message */}
          <p className="text-gray-600">
            {message}
          </p>

          {/* Success - Auto redirect message */}
          {state === 'success' && (
            <div className="glass rounded-lg p-4">
              <p className="text-sm text-gray-700">
                잠시 후 대시보드로 자동 이동합니다...
              </p>
            </div>
          )}

          {/* Error - Actions */}
          {state === 'error' && (
            <div className="space-y-3 pt-4">
              <Button
                variant="gradient"
                className="w-full"
                onClick={() => navigate('/register')}
              >
                다시 회원가입
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                로그인 페이지로
              </Button>
            </div>
          )}

          {/* Help Text */}
          {state === 'error' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>💡 인증 링크가 만료되었을 수 있습니다</p>
              <p>회원가입 페이지에서 다시 시도해주세요</p>
              <p className="text-red-500 mt-2">
                또는 PC 브라우저에서 이메일 링크를 클릭해보세요
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}