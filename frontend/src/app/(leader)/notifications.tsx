import { NotificationList } from '@/components/common/notification-list';
import { useLeader } from '@/contexts/leader-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useReports } from '@/contexts/report-context';
export default function NotificationsScreen() {
  const { notices } = useLeader();
  const { loadTasks, ready, error } = useWorkSchedule();
  const { refresh } = useReports();
  useFocusEffect(useCallback(() => {
    const update = () => { void loadTasks(); void refresh(); };
    update();
    const timer = setInterval(update, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [loadTasks, refresh]));
  return <NotificationList notices={notices} ready={ready} error={error} onRetry={loadTasks} />;
}
