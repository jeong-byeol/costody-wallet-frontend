import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { useUiStore } from '@/stores';

export function Register() {
  const navigate = useNavigate();
  const addNotification = useUiStore((state) => state.addNotification);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addNotification({ type: 'error', message: '올바른 이메일 형식이 아닙니다.' });
      return false;
    }

    // 비밀번호 검증
    if (password.length < 8) {
      addNotification({ type: 'error', message: '비밀번호는 8자 이상이어야 합니다.' });
      return false;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      addNotification({ type: 'error', message: '비밀번호가 일치하지 않습니다.' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authApi.register(email, password);
      
      addNotification({ 
        type: 'success', 
        message: response.message 
      });
      
      // 가입 완료 페이지로 이동 (이메일 전달)
      navigate('/register-success', { 
        state: { email: response.user.email } 
      });
    } catch (error: any) {
      const message = error.response?.data?.message || '회원가입에 실패했습니다.';
      addNotification({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 gradient-purple rounded-full blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 gradient-pink rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/login')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          로그인으로 돌아가기
        </Button>

        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gradient">
              Create Account
            </CardTitle>
            <CardDescription>
              Sign up to get started with secure custody
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
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
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="8자 이상 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  최소 8자 이상 입력해주세요
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="gradient" 
                className="w-full"
                disabled={loading}
              >
                {loading ? '처리 중...' : '회원가입'}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">이미 계정이 있으신가요? </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-purple-600 hover:underline font-medium"
              >
                로그인
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
