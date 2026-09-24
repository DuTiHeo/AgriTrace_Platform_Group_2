import { Keyboard, Switch, Text, View } from 'react-native';
import { AccountScreen } from '@/components/common/account-screen';
import { Card, Row } from '@/components/common/role-ui';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';
import { useAccountUtilities } from '@/contexts/account-utilities-context';
export default function SettingsScreen() {
  const { showBadge, setShowBadge } = useAccountUtilities();
  return <AccountScreen title="Cài đặt thông báo & ngôn ngữ">
    <Card><View style={s.row}><View style={{ flex: 1, gap: 6 }}>
      <Text style={s.section}>🔔 Thông báo</Text>
      <Text style={s.muted}>Hiện số thông báo chưa đọc trên biểu tượng chuông. Bạn vẫn xem được danh sách thông báo khi tắt.</Text>
    </View><Switch accessibilityLabel="Hiện số thông báo chưa đọc" value={showBadge} onValueChange={value => { Keyboard.dismiss(); setShowBadge(value); }} trackColor={{ true: colors.primary }} /></View></Card>
    <Card><Text style={s.section}>🌐 Ngôn ngữ</Text><Row label="Ngôn ngữ ứng dụng" value="Tiếng Việt" /><Text style={s.muted}>Ứng dụng hiện hỗ trợ Tiếng Việt.</Text></Card>
  </AccountScreen>;
}
