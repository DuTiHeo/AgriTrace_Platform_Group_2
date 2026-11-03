import { Keyboard, Text, TouchableWithoutFeedback, View } from 'react-native';
import { NotificationBell } from '@/components/common/notification_bell';
import { useAuth } from '@/contexts/auth_context';
import { PersonalAvatarButton } from '@/components/common/personal_avatar_button';
import { sharedStyles as s } from '@/styles/role_styles';

export function WorkerHeader({ showGreeting = true }: {
  showGreeting?: boolean
}) {
  const { user } = useAuth();

  return <TouchableWithoutFeedback
    onPress={Keyboard.dismiss}
    accessible={false}
  >
    <View style={s.header}>
      <PersonalAvatarButton role="worker" />
      <View style={{
        flex: 1
      }}>
        <Text style={s.muted}>
          {showGreeting ? 'Xin chào,' : 'AgriFarm · Công nhân'}
        </Text>
        <Text style={s.name}>
          {user?.full_name ?? 'Công nhân'}
        </Text>
      </View>
      <NotificationBell role="worker" />
    </View>
  </TouchableWithoutFeedback>;
}
