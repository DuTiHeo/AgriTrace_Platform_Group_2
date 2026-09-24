import { Tabs } from 'expo-router';

import { WorkerBottomNav } from '@/components/worker/worker-bottom-nav';

/** The five main Worker areas are tabs, so their navigation stays mounted. */
export default function WorkerLayout() {
  return (
    <Tabs initialRouteName="index" backBehavior="fullHistory" screenOptions={{ headerShown: false }} tabBar={(props) => <WorkerBottomNav {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="diary" options={{ title: 'Nhật ký' }} />
      <Tabs.Screen name="create-log" options={{ title: 'Ghi mới' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Lịch làm việc' }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
      <Tabs.Screen name="task-detail" options={{ href: null }} />
      <Tabs.Screen name="camera-report" options={{ href: null }} />
      <Tabs.Screen name="report-note" options={{ href: null }} />
      <Tabs.Screen name="personal-info" options={{ href: null }} />
      <Tabs.Screen name="diary-detail" options={{ href: null }} />
    </Tabs>
  );
}
