import { create } from 'zustand';

// Session Store
interface SessionState {
  accessToken?: string;
  userId?: string;
  email?: string;
  role?: string;
  userKey?: `0x${string}`;
  status?: 'ACTIVE' | 'FROZEN';
  setSession: (data: {
    accessToken: string;
    userId: string;
    email?: string;
    role?: string;
    userKey?: `0x${string}`;
    status?: 'ACTIVE' | 'FROZEN';
  }) => void;
  setUserKey: (userKey: `0x${string}`) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  accessToken: sessionStorage.getItem('accessToken') || undefined,
  userId: sessionStorage.getItem('userId') || undefined,
  email: sessionStorage.getItem('email') || undefined,
  role: sessionStorage.getItem('role') || undefined,
  status: 'ACTIVE',
  
  setSession: (data) => {
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('userId', data.userId);
    if (data.email) {
      sessionStorage.setItem('email', data.email);
    }
    if (data.role) {
      sessionStorage.setItem('role', data.role);
    }
    set(data);
  },
  
  setUserKey: (userKey) => set({ userKey }),
  
  clearSession: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('role');
    set({ accessToken: undefined, userId: undefined, email: undefined, role: undefined, userKey: undefined });
  },
  
  isAuthenticated: () => {
    const state = get();
    return !!state.accessToken && !!state.userId;
  },
}));

// Chain Store
interface ChainState {
  address?: `0x${string}`;
  chainId?: number;
  connected: boolean;
  setChain: (data: { address: `0x${string}`; chainId: number }) => void;
  clearChain: () => void;
}

export const useChainStore = create<ChainState>((set) => ({
  connected: false,
  
  setChain: (data) => set({ ...data, connected: true }),
  
  clearChain: () => set({ address: undefined, chainId: undefined, connected: false }),
}));

// UI Store
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
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  loadingCount: 0,
  notifications: [],
  
  startLoading: () => set((state) => ({ loadingCount: state.loadingCount + 1 })),
  
  stopLoading: () => set((state) => ({ 
    loadingCount: Math.max(0, state.loadingCount - 1) 
  })),
  
  addNotification: (notification) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  
  clearNotifications: () => set({ notifications: [] }),
}));

// Theme Store (다크모드 관리)
interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // localStorage에서 초기값 가져오기
  const getInitialTheme = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    
    // 저장된 값이 없으면 시스템 설정 확인
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const initialTheme = getInitialTheme();
  
  // 초기 로드 시 다크모드 적용
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (initialTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  return {
    isDark: initialTheme,
    
    toggleTheme: () => {
      set((state) => {
        const newTheme = !state.isDark;
        const root = document.documentElement;
        
        if (newTheme) {
          root.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          root.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
        
        return { isDark: newTheme };
      });
    },
    
    setTheme: (isDark: boolean) => {
      const root = document.documentElement;
      
      if (isDark) {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      
      set({ isDark });
    },
  };
});
