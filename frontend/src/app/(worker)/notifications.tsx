import { NotificationList } from '@/components/common/notification-list';
import { useWorkerNotifications } from '@/hooks/use-worker-notifications';
import { useReports } from '@/contexts/report-context';
import { useCallback } from 'react';
import { useTaskRefresh } from '@/hooks/use-task-refresh';

export default function WorkerNotificationsScreen() {
  const { notices, ready, error, retry } = useWorkerNotifications();
  const { refreshNotifications } = useReports();
  const update = useCallback(async () => { await retry(); await refreshNotifications(); }, [retry, refreshNotifications]);
  useTaskRefresh(update);
  return <NotificationList notices={notices} ready={ready} error={error} onRetry={() => { void update(); }} />;
}