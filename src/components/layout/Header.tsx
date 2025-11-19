// src/components/layout/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useSessionStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { truncateAddress } from '@/lib/format';
import { Wallet, LogOut, User, Menu, AlertCircle, Settings, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores';

export function Header() {
  const navigate = useNavigate();
  const { address, isConnected, chain } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();
  const { userId, status, role, clearSession } = useSessionStore();
  const { isDark, toggleTheme } = useThemeStore();
  
  // sessionStorage에서 직접 role 읽기 (store가 업데이트되지 않을 수 있으므로)
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  
  useEffect(() => {
    const storedRole = sessionStorage.getItem('role');
    setCurrentRole(storedRole);
  }, [userId, role]);

  // role 비교: store의 role 또는 sessionStorage의 role 사용
  const effectiveRole = role || currentRole;
  const isAdmin = effectiveRole?.toLowerCase() === 'admin';

  const handleLogout = () => {
    disconnectWallet();
    clearSession();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          <span className="font-bold text-xl">Custody Wallet</span>
        </Link>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Network Badge */}
          {isConnected && (
            <Badge
              variant={chain?.id === 11155111 ? 'default' : 'destructive'}
              className="hidden sm:flex"
            >
              {chain?.id === 11155111 ? (
                'Sepolia'
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Wrong Network
                </>
              )}
            </Badge>
          )}

          {/* Account Status */}
          {userId && status && (
            <Badge
              variant={status === 'ACTIVE' ? 'default' : 'destructive'}
              className="hidden sm:flex"
            >
              {status}
            </Badge>
          )}

          {/* Wallet Address */}
          {isConnected && address && (
            <Badge variant="outline" className="font-mono hidden md:flex">
              {truncateAddress(address)}
            </Badge>
          )}

          {/* Admin Settings Button */}
          {userId && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">관리자 설정</span>
              <span className="sm:hidden">관리</span>
            </Button>
          )}

          {/* Dark Mode Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User Menu */}
          {userId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <User className="h-4 w-4 mr-2" />
                  대시보드
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/deposit')}>
                  입금
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/withdraw/request')}>
                  출금
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/withdraw/settings')}>
                  출금 설정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/activity')}>
                  활동 내역
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                      <Settings className="h-4 w-4 mr-2" />
                      관리자 설정
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                {isConnected && address && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    <div className="font-mono truncate">{address}</div>
                    <div className="mt-1">
                      {chain?.name || 'Unknown Network'}
                    </div>
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/login')}>로그인</Button>
          )}
        </div>
      </div>
    </header>
  );
}