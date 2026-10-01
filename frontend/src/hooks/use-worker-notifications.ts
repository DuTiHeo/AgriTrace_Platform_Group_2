import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useReports } from '@/contexts/report-context';
import { useNotificationRead } from '@/contexts/notification-context';
import { buildWorkerNotices } from '@/sevices/notification-events';

export function useWorkerNotifications() {
  const { workerTasks, ready, error, retry } = useWorkSchedule();
  const { notificationReports, notificationsReady, notificationsError } = useReports();
  const { readIds, markRead } = useNotificationRead();
  const notices = buildWorkerNotices(workerTasks, notificationReports);
  return {
    notices,
    unread: notices.filter(notice => !readIds.includes(notice.id)).length,
    readIds,
    markRead,
    ready: ready && notificationsReady,
    error: error || notificationsError,
    retry,
  };
}