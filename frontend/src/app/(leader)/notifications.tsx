import { NotificationList } from '@/components/common/notification-list';
import { useLeader } from '@/contexts/leader-context';
export default function NotificationsScreen() {
  const { notices } = useLeader();
  return <NotificationList notices={notices} />;
}
