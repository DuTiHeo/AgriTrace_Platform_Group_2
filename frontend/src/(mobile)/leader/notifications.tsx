import { NotificationList } from '@/components/common/notification_list';
import { useLeader } from '@/contexts/leader_context';
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { useCallback } from 'react';
import { useReports } from '@/contexts/report_context';
import { useTaskRefresh } from '@/hooks/use_task_refresh';

export default function NotificationsScreen() {
  const { notices } = useLeader();
  const { loadTasks, ready, error } = useWorkSchedule();
  const { refreshNotifications, notificationsReady, notificationsError } = useReports();
  const update = useCallback(async () => { await loadTasks(); await refreshNotifications(); }, [loadTasks, refreshNotifications]);
  useTaskRefresh(update);
  return <NotificationList notices={notices} ready={ready && notificationsReady}
    error={error || notificationsError} onRetry={() => { void update(); }} />;
}