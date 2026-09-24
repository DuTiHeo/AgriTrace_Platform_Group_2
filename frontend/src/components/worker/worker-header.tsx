import { useAccountUtilities } from '@/contexts/account-utilities-context';
import { useWorkerNotifications } from '@/hooks/use-worker-notifications';
import { type Href, router } from 'expo-router';
import { Keyboard, Pressable, Text, TouchableWithoutFeedback, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/contexts/auth-context';
import { PersonalAvatarButton } from '@/components/common/personal-avatar-button';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

export function WorkerHeader({ showGreeting = true }: { showGreeting?: boolean }) {
  const { user } = useAuth();
  const { showBadge } = useAccountUtilities();
  const { unread } = useWorkerNotifications();
  return <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={s.header}>
      <PersonalAvatarButton role="worker" />
      <View style={{ flex: 1 }}>
        <Text style={s.muted}>{showGreeting ? 'Xin chào,' : 'AgriFarm · Công nhân'}</Text>
        <Text style={s.name}>{user?.full_name ?? 'Công nhân'}</Text>
      </View>
      <Pressable accessibilityLabel="Thông báo" hitSlop={8} style={s.bell} onPress={() => { Keyboard.dismiss(); router.push('/(worker)/notifications' as Href); }}>
        <SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} size={23} tintColor={colors.text} />
        <>{showBadge && unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{unread}</Text></View>}</>
      </Pressable>
    </View>
  </TouchableWithoutFeedback>;
}
