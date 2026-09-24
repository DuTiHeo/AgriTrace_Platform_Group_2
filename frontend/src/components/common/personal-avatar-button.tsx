import { router, type Href } from 'expo-router';
import { Keyboard, Pressable } from 'react-native';
import { Avatar } from './role-ui';
import { useAuth } from '@/contexts/auth-context';
export function PersonalAvatarButton({ role }: { role: 'worker' | 'leader' }) {
  const { user } = useAuth();
  const path = '/account/personal-info';
  return <Pressable accessibilityRole="button" accessibilityLabel="Xem thông tin cá nhân của tôi" hitSlop={8}
    onPress={() => { Keyboard.dismiss(); router.push(path as Href); }}>
    <Avatar name={user?.full_name ?? (role === 'leader' ? 'Tổ trưởng' : 'Công nhân')} small />
  </Pressable>;
}
