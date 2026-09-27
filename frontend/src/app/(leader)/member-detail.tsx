import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLeader } from '@/contexts/leader-context';
import { Avatar, Button, Card, Empty, Row, Screen, s } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';
import { useAuth } from '@/contexts/auth-context';
import { getUserDetail, type UserDetail } from '@/sevices/farming-log.service';
import { colors } from '@/styles/theme';

const roleLabel: Record<string, string> = {
  worker: 'Công nhân', leader: 'Tổ trưởng', owner: 'Chủ nông trại', admin: 'Quản trị viên',
};

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members } = useLeader();
  const { accessToken } = useAuth();
  const summary = members.find(member => member.id === id);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken || !id) {
      setError('Không xác định được thành viên cần xem.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userDetail = await getUserDetail(accessToken, id);
      setDetail(userDetail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được thông tin thành viên.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Screen title="Thông tin thành viên" back>
      {loading ? (
        <Card><ActivityIndicator color={colors.primary} /></Card>
      ) : detail ? (
        <>
          <Card>
            <View style={s.row}>
              <Avatar name={detail.full_name} />
              <View style={{ flex: 1 }}>
                <Text style={s.section}>{detail.full_name}</Text>
                <Text style={s.muted}>{roleLabel[detail.role] ?? detail.role}</Text>
              </View>
            </View>
            <Row label="Số điện thoại" value={detail.phone} />
            <Row label="Trạng thái tài khoản" value={detail.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'} />
            <Row label="CCCD" value={detail.national_id || 'Chưa có dữ liệu'} />
            <Row label="Ngày sinh" value={dateLabel(detail.date_of_birth)} />
            <Row label="Địa chỉ" value={detail.address || 'Chưa có dữ liệu'} />
            <Row label="Ngày tham gia" value={dateLabel(detail.created_at)} />
          </Card>
        </>
      ) : summary ? (
        <Card>
          <Text style={s.section}>{summary.name}</Text>
          <Feedback text={error} />
          <Button title="Thử tải lại" onPress={() => void load()} />
        </Card>
      ) : (
        <>
          <Empty text="Không tìm thấy thành viên trong tổ." />
          {!!error && <Feedback text={error} />}
        </>
      )}
    </Screen>
  );
}
