import { useNotifications } from '@/contexts/notification_context';

export function useWorkerNotifications() {
  return useNotifications();
}
