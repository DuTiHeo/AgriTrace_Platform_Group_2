import { NotificationList } from '@/components/common/notification-list';
import { useWorkerNotifications } from '@/hooks/use-worker-notifications';
import { useReports } from '@/contexts/report-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';
export default function WorkerNotificationsScreen() {
  const { notices, ready, error, retry } = useWorkerNotifications();
  const { refresh } = useReports();
  useFocusEffect(useCallback(() => {
    const update = () => { void refresh(); void retry(); };
    update();
    const timer = setInterval(update, 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [refresh, retry]));
  return <NotificationList notices={notices} ready={ready} error={error} onRetry={retry} />;
}
