import { Tabs } from 'expo-router';

import { WorkerBottomNav } from '@/components/worker/worker_bottom_nav';

/** The five main Worker areas are tabs, so their navigation stays mounted. */
export const unstable_settings = { initialRouteName: 'index' };

export default function WorkerLayout() {
  return (
    <Tabs backBehavior="fullHistory" screenOptions={{ headerShown: false }} tabBar={(props) => <WorkerBottomNav {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="diary" options={{ title: 'Nhật ký' }} />
      <Tabs.Screen name="create_log" options={{ title: 'Ghi mới' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Lịch làm việc' }} />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
      <Tabs.Screen name="task_detail" />
      <Tabs.Screen name="camera_report" />
      <Tabs.Screen name="report_note" />
      <Tabs.Screen name="personal_info" />
      <Tabs.Screen name="diary_detail" />
    </Tabs>
  );
}
