import { NotificationList } from '@/components/common/notification-list';
import { useLeader } from '@/contexts/leader-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useCallback } from 'react';
import { useReports } from '@/contexts/report-context';
import { useTaskRefresh } from '@/hooks/use-task-refresh';

export default function NotificationsScreen() {
  const { notices } = useLeader();
  const { loadTasks, ready, error } = useWorkSchedule();
  const { refreshNotifications, notificationsReady, notificationsError } = useReports();
  const update = useCallback(async () => { await loadTasks(); await refreshNotifications(); }, [loadTasks, refreshNotifications]);
  useTaskRefresh(update);
  return <NotificationList notices={notices} ready={ready && notificationsReady}
    error={error || notificationsError} onRetry={() => { void update(); }} />;
}