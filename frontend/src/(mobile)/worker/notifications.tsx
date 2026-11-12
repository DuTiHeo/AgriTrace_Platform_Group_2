import { NotificationList } from '@/components/common/notification_list';
import { useNotifications } from '@/contexts/notification_context';
import { useTaskRefresh } from '@/hooks/use_task_refresh';

export default function NotificationsScreen() {
  const { refresh } = useNotifications();
  useTaskRefresh(refresh);
  return <NotificationList />;
}
