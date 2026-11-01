import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/contexts/auth_context';
import { LeaderProvider } from '@/contexts/leader_context';
import { LeaderBottomNav } from '@/components/leader/leader_bottom_nav';
export const unstable_settings = { initialRouteName: 'index' };

export default function LeaderLayout() {
  const { user, accessToken } = useAuth();
  if (!accessToken || !user) return <Redirect href="/login" />;
  if (user.role !== 'leader') return <Redirect href="/worker" />;
  return <LeaderProvider key={accessToken}><Tabs backBehavior="fullHistory" screenOptions={{ headerShown: false }} tabBar={props => <LeaderBottomNav {...props} />}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
    <Tabs.Screen name="assignments" options={{ title: 'Giao việc' }} />
    <Tabs.Screen name="create_assignment" />
    <Tabs.Screen name="edit_assignment" />
    <Tabs.Screen name="diary" options={{ title: 'Nhật ký' }} />
    <Tabs.Screen name="members" options={{ title: 'Thành viên' }} />
    <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    <Tabs.Screen name="member_detail" />
    <Tabs.Screen name="diary_detail" />
    <Tabs.Screen name="capture" />
    <Tabs.Screen name="notifications" />
    <Tabs.Screen name="issues" />
    <Tabs.Screen name="areas" />
    <Tabs.Screen name="settings" />
    <Tabs.Screen name="personal_info" />
  </Tabs></LeaderProvider>;
}
