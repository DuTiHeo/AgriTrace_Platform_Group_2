import { Keyboard, Switch, Text, View } from 'react-native';
import { AccountScreen } from '@/components/common/account-screen';
import { Card } from '@/components/common/role-ui';
import { useAccountUtilities } from '@/contexts/account-utilities-context';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

export default function NotificationSettingsScreen() {
  const { showBadge, setShowBadge } = useAccountUtilities();
  return <AccountScreen title="Cài đặt thông báo">
    <Card>
      <View style={s.row}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.section}>Hiện số thông báo chưa đọc</Text>
          <Text style={s.muted}>Hiện số lượng chưa đọc trên biểu tượng chuông. Bạn vẫn xem được danh sách thông báo khi tắt.</Text>
        </View>
        <Switch accessibilityLabel="Hiện số thông báo chưa đọc" value={showBadge} onValueChange={value => { Keyboard.dismiss(); setShowBadge(value); }} trackColor={{ true: colors.primary }} />
      </View>
    </Card>
  </AccountScreen>;
}
