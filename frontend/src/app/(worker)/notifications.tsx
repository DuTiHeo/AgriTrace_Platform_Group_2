import { NotificationList } from '@/components/common/notification-list';
import { useWorkerNotifications } from '@/hooks/use-worker-notifications';
export default function WorkerNotificationsScreen() {
  const { notices, ready, error, retry } = useWorkerNotifications();
  return <NotificationList notices={notices} ready={ready} error={error} onRetry={retry} />;
}
