import { Avatar } from '@/components/common/role-ui';
import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorkerHeader } from '@/components/worker/worker-header';
import { useAuth } from '@/contexts/auth-context';
import { logout } from '@/sevices/auth.sevice';
import { useWorkSchedule } from '@/contexts/work-schedule-context';

const utilities = [
  { label: '⚠️  Báo cáo sự cố / Lỗi kỹ thuật', route: '/account/issues' },
  { label: '🔒  Đổi mật khẩu', route: '/account/change-password' },
  { label: '🔔  Cài đặt thông báo', route: '/account/notification-settings' },
  { label: '🌐  Ngôn ngữ (Tiếng Việt)', route: '/account/language' },
];

export default function WorkerProfileScreen() {
  const { user, accessToken, clearAuth } = useAuth();
  const { workerTasks } = useWorkSchedule();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const submitting = useRef(false);
  const assignedAreas = [...new Set(workerTasks.map(task => task.area).filter(Boolean))];
  const completedTasks = workerTasks.filter(task => task.status === 'done').length;
  const roleName = user?.role === 'worker' ? 'Công nhân' : user?.role ?? 'Chưa có dữ liệu';
  const teamText = user?.team_id ? `Mã tổ ${user.team_id}` : 'Chưa được phân tổ';

  async function signOut() {
    if (submitting.current) return;
    submitting.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      if (accessToken) await logout(accessToken);
      clearAuth();
      router.replace('/login' as Href);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Đăng xuất thất bại. Vui lòng thử lại.');
    } finally {
      submitting.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <WorkerHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={shared.title}>Cá nhân</Text>
        <View style={styles.profileCard}>
          <Avatar name={user?.full_name ?? 'Công nhân'} />

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user?.full_name ?? 'Công nhân'}
            </Text>

            <Text style={styles.role}>
              {roleName} · {teamText}
            </Text>

            <Text style={styles.active}>
              Đang làm việc
            </Text>
          </View>
        </View>

        <Section title="📋 Thông tin hồ sơ">
          <Info
            label="Số điện thoại:"
            value={user?.phone ?? 'Chưa cập nhật'}
          />

          <Info
            label="Khu vực phụ trách:"
            value={assignedAreas.length ? assignedAreas.join(', ') : 'Chưa có dữ liệu'}
          />

          <Info
            label="Ngày gia nhập:"
            value="Chưa có dữ liệu"
          />

          <Info
            label="Tổng nhật ký đã đăng:"
            value="Chưa có dữ liệu"
            green
          />

          <Info
            label="Nhiệm vụ hoàn thành:"
            value={`${completedTasks} nhiệm vụ`}
            green
          />
        </Section>

        <Section title="⚙️ Cài đặt & Tiện ích">
          {utilities.map((setting) => (
            <Pressable
              key={setting.label}
              style={styles.setting}
              onPress={() => { Keyboard.dismiss(); router.push(setting.route as Href); }}
            >
              <Text style={styles.settingText}>
                {setting.label}
              </Text>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </Section>

        {logoutError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 12 }}>
            {logoutError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
          disabled={loggingOut}
          onPress={signOut}
          style={[styles.logout, loggingOut && { opacity: 0.6 }]}
        >
          <Text style={styles.logoutText}>
            {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function Info({
  label,
  value,
  green
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          green && styles.green
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...shared.page },

  content: { ...shared.content },

  profileCard: { ...shared.card, flexDirection: "row", alignItems: "center" },

  avatar: { ...shared.avatar },

  avatarText: {
    fontSize: 30
  },

  name: { ...shared.section },

  role: { ...shared.muted, marginTop: 5 },

  active: { ...shared.chip, ...shared.chipText, marginTop: 8 },

  section: { ...shared.card },

  sectionTitle: { ...shared.section },

  info: { ...shared.infoRow, alignItems: "center" },

  infoLabel: { ...shared.muted, flex: 1 },

  infoValue: { ...shared.value },

  green: {
    color: colors.success
  },

  setting: { ...shared.infoRow, minHeight: 48, alignItems: "center" },

  settingText: { ...shared.label, flex: 1 },

  arrow: { ...shared.muted, fontSize: 25 },

  logout: { ...shared.dangerButton },

  logoutText: { ...shared.dangerText },
});
