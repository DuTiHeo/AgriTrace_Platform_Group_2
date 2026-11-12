import { Text } from 'react-native';
import { AccountScreen } from '@/components/common/account_screen';
import { Card, Row } from '@/components/common/role_ui';
import { sharedStyles as s } from '@/styles/role_styles';

export default function LanguageScreen() {
  return <AccountScreen title="Ngôn ngữ">
    <Card>
      <Row label="Ngôn ngữ ứng dụng" value="Tiếng Việt" />
      <Text style={s.muted}>Ứng dụng hiện hỗ trợ Tiếng Việt.</Text>
    </Card>
  </AccountScreen>;
}
