import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { useUiStore } from '@/stores';

export function RegisterSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const addNotification = useUiStore((state) => state.addNotification);

  const email = location.state?.email;
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // 이메일 정보가 없으면 로그인 페이지로
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    // 카운트다운 타이머
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email || !canResend) return;

    setResending(true);
    try {
      const response = await authApi.resendVerification(email);
      addNotification({ type: 'success', message: response.message });
      
      // 60초 재발송 제한
      setCanResend(false);
      setCountdown(60);
    } catch (error: any) {
      const message = error.response?.data?.message || '이메일 재발송에 실패했습니다.';
      addNotification({ type: 'error', message });
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 gradient-blue rounded-full blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 gradient-purple rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="max-w-md w-full relative z-10 animate-fade-in">
        <CardContent className="p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="w-20 h-20 gradient-blue rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-gradient mb-2">
              이메일을 확인하세요
            </h2>
            <p className="text-gray-600">
              회원가입이 거의 완료되었습니다!
            </p>
          </div>

          {/* Email Info */}
          <div className="glass rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700">
              다음 이메일로 인증 링크를 보내드렸습니다:
            </p>
            <p className="font-mono text-sm font-semibold text-purple-600 break-all">
              {email}
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                이메일을 열어 <strong>인증 링크</strong>를 클릭하세요
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                인증이 완료되면 <strong>자동으로 로그인</strong>됩니다
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                인증 링크는 <strong>2시간 동안 유효</strong>합니다
              </p>
            </div>
          </div>

          {/* Resend Button */}
          <div className="pt-4">
            <Button
              variant="glass"
              className="w-full"
              onClick={handleResend}
              disabled={!canResend || resending}
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  재발송 중...
                </>
              ) : !canResend ? (
                `재발송 가능까지 ${countdown}초`
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  인증 이메일 재발송
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 이메일이 보이지 않나요?</p>
            <p>스팸 폴더를 확인해주세요</p>
          </div>

          {/* Back to Login */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
