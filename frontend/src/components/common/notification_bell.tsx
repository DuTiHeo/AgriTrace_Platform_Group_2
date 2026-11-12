import { useAccountUtilities } from '@/contexts/account_utilities_context';
import { useNotifications } from '@/contexts/notification_context';
import { sharedStyles as s } from '@/styles/role_styles';
import { colors } from '@/styles/theme';
import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import { Keyboard, Pressable, Text, View } from 'react-native';

export function NotificationBell({ role }: { role: 'worker' | 'leader' }) {
  const { showBadge } = useAccountUtilities();
  const { unread } = useNotifications();
  const hasBadge = showBadge && unread > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Thông báo${hasBadge ? `, ${unread} chưa đọc` : ''}`}
      hitSlop={8}
      style={({ pressed }) => [s.bell, pressed && { backgroundColor: colors.primarySoft }]}
      onPress={() => {
        Keyboard.dismiss();
        router.push(`/${role}/notifications` as Href);
      }}
    >
      <SymbolView
        name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
        size={23}
        tintColor={colors.text}
      />
      {hasBadge && (
        <View style={s.badge} pointerEvents="none">
          <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}
