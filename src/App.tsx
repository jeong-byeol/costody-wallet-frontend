import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useSessionStore } from '@/stores';
import { Toaster } from '@/components/Toaster';

// Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { RegisterSuccess } from '@/pages/RegisterSuccess';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { Dashboard } from '@/pages/Dashboard';
import { Deposit } from '@/pages/Deposit';
import { WithdrawSettings } from '@/pages/WithdrawSettings';
import { WithdrawRequest } from '@/pages/WithdrawRequest';
import { Activity } from '@/pages/Activity';
import { AdminDashboard } from '@/pages/AdminDashboard';

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated());
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register-success" element={<RegisterSuccess />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
              
              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/deposit"
                element={
                  <ProtectedRoute>
                    <Deposit />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/withdraw/settings"
                element={
                  <ProtectedRoute>
                    <WithdrawSettings />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/withdraw/request"
                element={
                  <ProtectedRoute>
                    <WithdrawRequest />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <Activity />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Default Route */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
          
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
