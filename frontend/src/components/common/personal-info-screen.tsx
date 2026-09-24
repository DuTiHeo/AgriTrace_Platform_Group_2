import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { getMe, type UserInformation } from '@/sevices/auth.sevice';
import { sharedStyles as shared } from '@/styles/role-styles';
import { colors } from '@/styles/theme';
import { Button } from './role-ui';
const roleNames: Record<string, string> = { worker: 'Công nhân', leader: 'Tổ trưởng', owner: 'Chủ nông trại', admin: 'Quản trị viên' };
export function PersonalInfoScreen() {
  const { accessToken } = useAuth();
  const [information, setInformation] = useState<UserInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setInformation(null); setError(''); setLoading(true);
    if (!accessToken) { setLoading(false); return; }
    getMe(accessToken).then(value => { if (active) setInformation(value); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Không thể tải thông tin cá nhân.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, retry]));
  if (!accessToken) return <Redirect href="/login" />;
  return <SafeAreaView style={shared.page} edges={['top', 'bottom']}>
    <View style={shared.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={() => router.back()}><Text style={shared.backText}>‹</Text></Pressable>
      <Text style={[shared.section, { flex: 1, textAlign: 'center' }]}>Thông tin cá nhân</Text>
      <View style={{ width: 28 }} />
    </View>
    <ScrollView contentContainerStyle={shared.content}>
      {loading ? <View style={s.message}><ActivityIndicator color={colors.primary} /><Text style={shared.muted}>Đang tải thông tin…</Text></View>
        : error ? <View style={shared.card}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text><Button title="Thử lại" onPress={() => setRetry(value => value + 1)} /></View>
        : information && <>
          <View style={s.identity}>
            <View style={s.avatar}><Text style={s.initials}>{information.full_name.trim().split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || '?'}</Text></View>
            <Text style={shared.muted}>Thông tin từ hệ thống · Chỉ xem</Text>
          </View>
          <Field label="Họ và tên" value={information.full_name} />
          <Field label="Số điện thoại" value={information.phone} />
          <Field label="Email" value={null} />
          <Field label="Địa chỉ" value={information.address} />
          <Field label="Vai trò" value={roleNames[information.role] ?? information.role} />
        </>}
    </ScrollView>
  </SafeAreaView>;
}
// Dùng Text thay vì ô nhập: không mở bàn phím và không cho sửa dữ liệu.
function Field({ label, value }: { label: string; value: string | null }) {
  return <View style={{ gap: 8 }}><Text style={shared.label}>{label}</Text>
    <View style={s.field}><Text selectable style={[shared.body, !value?.trim() && shared.muted]}>{value?.trim() || 'Chưa có dữ liệu'}</Text></View>
  </View>;
}
const s = StyleSheet.create({
  identity: { alignItems: 'center', gap: 14, paddingVertical: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 28, fontWeight: '800', color: colors.primary },
  field: { backgroundColor: colors.input, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, minHeight: 48, justifyContent: 'center' },
  message: { paddingVertical: 40, gap: 14, alignItems: 'center' },
});
