import { useEffect, useState } from "react";
import { router, type Href } from "expo-router";
import { Keyboard, Pressable, Text, View } from "react-native";
import { useAuth } from "@/contexts/auth-context";
import { useLeader } from "@/contexts/leader-context";
import { logout } from "@/sevices/auth.sevice";
import {
  Avatar,
  Button,
  Card,
  go,
  Row,
  Screen,
  Section,
  s
} from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";
import { listMyTasks, listPlots } from '@/sevices/farming-log.service';

export default function ProfileScreen() {
  const { user, accessToken, clearAuth } = useAuth();
  const { members, diaries } = useLeader();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [management, setManagement] = useState<{ areas: string[]; taskCount: number } | null>(null);

  useEffect(() => {
    let active = true;
    if (!accessToken) return;
    Promise.all([listPlots(accessToken), listMyTasks(accessToken)])
      .then(([plots, apiTasks]) => {
        if (active) setManagement({ areas: plots.map(plot => plot.code), taskCount: apiTasks.length });
      })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được thông tin quản lý.'); });
    return () => { active = false; };
  }, [accessToken]);

  async function signOut() {
    if (busy)
      return;

    setBusy(true);
    setError('');

    try {
      if (accessToken)
        await logout(accessToken);

      clearAuth();
      router.replace('/login');
    }
    catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đăng xuất.');
    }
    finally {
      setBusy(false);
    }
  }

  const links = [
    ['members', 'Quản lý thành viên tổ'],
    ['areas', 'Danh mục vùng trồng'],
    ['change-password', 'Đổi mật khẩu'],
    ['settings', 'Cài đặt thông báo & ngôn ngữ'],
    ['issues', 'Báo cáo sự cố / Lỗi kỹ thuật']
  ];

  return (
    <Screen title="Cá nhân">
      <Card>
        <View style={s.row}>
          <Avatar name={user?.full_name ?? 'Tổ trưởng'} />

          <View>
            <Text style={s.section}>
              {user?.full_name ?? 'Tổ trưởng'}
            </Text>

            <Text style={s.muted}>
              Tổ trưởng
            </Text>

            <View style={[s.chip, { alignSelf: 'flex-start', marginTop: 8 }]}>
              <Text style={s.chipText}>Đang làm việc</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <Section title="Thông tin quản lý" />

        <Row
          label="Số điện thoại"
          value={user?.phone ?? 'Chưa cập nhật'}
        />

        <Row
          label="Khu vực quản lý"
          value={management ? (management.areas.join(', ') || 'Chưa có dữ liệu') : 'Đang tải…'}
        />

        <Row
          label="Thành viên tổ"
          value={`${members.length} nhân sự`}
        />

        <Row
          label="Nhiệm vụ đã giao"
          value={management ? `${management.taskCount} nhiệm vụ` : 'Đang tải…'}
        />

        <Row
          label="Nhật ký trong tổ"
          value={`${diaries.length} nhật ký`}
        />
      </Card>

      <Card>
        <Section title="Quản lý & tiện ích" />

        {links.map(([path, label]) => (
          <Pressable
            key={path}
            onPress={() => { Keyboard.dismiss(); if (['issues', 'settings', 'change-password'].includes(path)) router.push(`/account/${path}` as Href); else go(path); }}
            style={[s.infoRow, { alignItems: 'center' }]}
          >
            <Text style={[s.label, { flex: 1 }]}>
              {label}
            </Text>

            <Text style={s.muted}>
              ›
            </Text>
          </Pressable>
        ))}
      </Card>

      <Feedback text={error} />

      <Button
        danger
        title={busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
        disabled={busy}
        onPress={signOut}
      />
    </Screen>
  );
}
