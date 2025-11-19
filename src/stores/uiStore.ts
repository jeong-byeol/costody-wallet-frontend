// src/stores/ui.ts (개선 버전)
import { create } from 'zustand';
import { toast } from '@/lib/hooks/useToast';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UiState {
  loadingCount: number;
  notifications: Notification[];
  startLoading: () => void;
  stopLoading: () => void;
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  loadingCount: 0,
  notifications: [],

  startLoading: () =>
    set((state) => ({ loadingCount: state.loadingCount + 1 })),

  stopLoading: () =>
    set((state) => ({
      loadingCount: Math.max(0, state.loadingCount - 1),
    })),

  addNotification: (type, message) => {
    const id = Math.random().toString(36).substring(7);
    
    // Toast 표시
    toast({
      variant: type === 'error' ? 'destructive' : type === 'success' ? 'success' : 'default',
      title: type === 'success' ? '성공' : type === 'error' ? '오류' : '알림',
      description: message,
    });

    // Store에도 추가
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }));

    // 5초 후 자동 제거
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);

    return id;
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));