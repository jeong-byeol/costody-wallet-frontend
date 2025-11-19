import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from '@/components/ui/toast';
import { useUiStore } from '@/stores';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const VARIANTS = {
  success: 'success',
  error: 'destructive',
  info: 'default',
  warning: 'warning',
} as const;

export function Toaster() {
  const { notifications, removeNotification } = useUiStore();

  return (
    <ToastProvider>
      {notifications.map((notification) => {
        const Icon = ICONS[notification.type];
        const variant = VARIANTS[notification.type];

        return (
          <Toast
            key={notification.id}
            variant={variant}
            onOpenChange={(open) => {
              if (!open) {
                removeNotification(notification.id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <ToastDescription>{notification.message}</ToastDescription>
              </div>
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
