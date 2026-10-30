import { NotificationList } from '@/components/common/notification_list';
import { useWorkerNotifications } from '@/hooks/use_worker_notifications';
import { useReports } from '@/contexts/report_context';
import { useCallback } from 'react';
import { useTaskRefresh } from '@/hooks/use_task_refresh';

export default function WorkerNotificationsScreen() {
  const { notices, ready, error, retry } = useWorkerNotifications();
  const { refreshNotifications } = useReports();
  const update = useCallback(async () => { await retry(); await refreshNotifications(); }, [retry, refreshNotifications]);
  useTaskRefresh(update);
  return <NotificationList notices={notices} ready={ready} error={error} onRetry={() => { void update(); }} />;
}