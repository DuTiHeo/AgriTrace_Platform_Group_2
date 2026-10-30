import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { useReports } from '@/contexts/report_context';
import { useNotificationRead } from '@/contexts/notification_context';
import { buildWorkerNotices } from '@/sevices/notification_events';

export function useWorkerNotifications() {
  const { workerTasks, ready, error, retry } = useWorkSchedule();
  const { notificationReports, notificationsReady, notificationsError } = useReports();
  const { readIds } = useNotificationRead();
  const notices = buildWorkerNotices(workerTasks, notificationReports);
  return {
    notices,
    unread: notices.filter(notice => !readIds.includes(notice.id)).length,
    ready: ready && notificationsReady,
    error: error || notificationsError,
    retry,
  };
}
