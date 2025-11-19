// src/app/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Pages (나중에 생성)
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Deposit from '../pages/Deposit';
import WithdrawSettings from '../pages/WithdrawSettings';
import WithdrawRequest from '../pages/WithdrawRequest';
import Activity from '../pages/Activity';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'deposit',
        element: (
          <ProtectedRoute>
            <Deposit />
          </ProtectedRoute>
        ),
      },
      {
        path: 'withdraw/settings',
        element: (
          <ProtectedRoute>
            <WithdrawSettings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'withdraw/request',
        element: (
          <ProtectedRoute>
            <WithdrawRequest />
          </ProtectedRoute>
        ),
      },
      {
        path: 'activity',
        element: (
          <ProtectedRoute>
            <Activity />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);