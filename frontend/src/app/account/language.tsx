import { Text } from 'react-native';
import { AccountScreen } from '@/components/common/account-screen';
import { Card, Row } from '@/components/common/role-ui';
import { sharedStyles as s } from '@/styles/role-styles';

export default function LanguageScreen() {
  return <AccountScreen title="Ngôn ngữ">
    <Card>
      <Row label="Ngôn ngữ ứng dụng" value="Tiếng Việt" />
      <Text style={s.muted}>Ứng dụng hiện hỗ trợ Tiếng Việt.</Text>
    </Card>
  </AccountScreen>;
}
