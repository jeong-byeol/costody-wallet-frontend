// src/components/layout/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore, useUiStore } from '@/stores';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // ✅ useShallow for Zustand v5 (prevents reference changes)
  const { accessToken, userId } = useSessionStore(
    useShallow((state) => ({
      accessToken: state.accessToken,
      userId: state.userId,
    }))
  );
  
  const addNotification = useUiStore((state) => state.addNotification);
  const location = useLocation();
  
  // ✅ useRef prevents duplicate notifications
  const notificationShown = useRef(false);

  // ✅ Side effects in useEffect, NOT during render
  useEffect(() => {
    if (!accessToken && !userId && !notificationShown.current) {
      addNotification('error', '로그인이 필요합니다');
      notificationShown.current = true;
    }

    // Reset flag when user authenticates
    if (accessToken && userId) {
      notificationShown.current = false;
    }
  }, [accessToken, userId, addNotification]);

  // ✅ Early return with replace
  if (!accessToken || !userId) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ from: location.pathname }} 
      />
    );
  }

  return <>{children}</>;
}