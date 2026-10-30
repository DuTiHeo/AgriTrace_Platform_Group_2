import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/contexts/auth_context';
import { LeaderProvider } from '@/contexts/leader_context';
import { LeaderBottomNav } from '@/components/leader/leader_bottom_nav';
export default function LeaderLayout() {
  const { user, accessToken } = useAuth();
  if (!accessToken || !user) return <Redirect href="/login" />;
  if (user.role !== 'leader') return <Redirect href="/worker" />;
  return <LeaderProvider key={accessToken}><Tabs initialRouteName="index" backBehavior="fullHistory" screenOptions={{ headerShown: false }} tabBar={props => <LeaderBottomNav {...props} />}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
    <Tabs.Screen name="assignments" options={{ title: 'Giao việc' }} />
    <Tabs.Screen name="create_assignment" options={{ href: null }} />
    <Tabs.Screen name="diary" options={{ title: 'Nhật ký' }} />
    <Tabs.Screen name="members" options={{ title: 'Thành viên' }} />
    <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    <Tabs.Screen name="member_detail" options={{ href: null }} />
    <Tabs.Screen name="diary_detail" options={{ href: null }} />
    <Tabs.Screen name="capture" options={{ href: null }} />
    <Tabs.Screen name="notifications" options={{ href: null }} />
    <Tabs.Screen name="issues" options={{ href: null }} />
    <Tabs.Screen name="areas" options={{ href: null }} />
    <Tabs.Screen name="settings" options={{ href: null }} />
    <Tabs.Screen name="personal_info" options={{ href: null }} />
  </Tabs></LeaderProvider>;
}
