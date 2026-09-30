import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { useLeader } from "@/contexts/leader-context";
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { colors } from '@/styles/theme';
import { useAuth } from '@/contexts/auth-context';
import { localToday } from '@/contexts/notification-context';
import { listLogs, type FarmingLog } from '@/sevices/farming-log.service';
import { inJournalPeriod } from '@/sevices/journal-filter';
import {
  Avatar,
  Button,
  Card,
  Chip,
  dateText,
  go,
  Screen,
  Section,
  s,
  Status
} from "@/components/leader/ui";

export default function HomeScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks, draft, loadMembers } = useLeader();
  const { startTask, loadTasks, leaderTasks, error } = useWorkSchedule();
  const { accessToken } = useAuth();
  const [today, setToday] = useState(localToday);
  const [summaryLogs, setSummaryLogs] = useState<FarmingLog[]>([]);
  const [summaryError, setSummaryError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    let refreshing = false;
    setSummaryLogs([]);
    const refreshSummary = async () => {
      setToday(localToday());
      if (refreshing || !accessToken) return;
      refreshing = true;
      try {
        const [logs] = await Promise.all([listLogs(accessToken), loadTasks(), loadMembers()]);
        if (active) { setSummaryLogs(logs); setSummaryError(''); }
      } catch {
        if (active) setSummaryError('Không tải được số nhật ký hôm nay.');
      } finally { refreshing = false; }
    };
    void refreshSummary();
    const timer = setInterval(() => { void refreshSummary(); }, 30000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshSummary();
    });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [accessToken, loadTasks, loadMembers]));
  const ownerTasks = tasks.filter(t => t.owner && (!taskId || t.id === taskId));
  const active = members.filter(m => m.active);

  const stats = [
    {
      n: active.length,
      label: 'Đang hoạt động',
      sub: `${members.length} thành viên`,
      path: 'members'
    },
    {
      n: summaryError ? '—' : summaryLogs.filter(log => inJournalPeriod(log.logged_at, 'today', new Date(`${today}T12:00:00`))).length,
      label: 'Nhật ký hôm nay',
      sub: 'Cập nhật từ tổ',
      path: 'diary'
    },
    {
      n: tasks.filter(t => t.status !== 'done' && (t.startDate || t.due) <= today && t.due >= today).length,
      label: 'Việc cần làm',
      sub: 'Trong hôm nay',
      path: 'assignments'
    },
    {
      n: leaderTasks.filter(t => t.status === 'done' && !!t.updatedAt && inJournalPeriod(t.updatedAt, 'today', new Date(`${today}T12:00:00`))).length,
      label: 'Đã hoàn thành',
      sub: 'Hoàn thành hôm nay',
      path: 'assignments'
    }
  ];

  return (
    <Screen>
      {!!taskId && <Card><Text style={s.section}>Công việc từ thông báo</Text><Text style={s.muted}>{ownerTasks[0]?.title ?? 'Công việc không còn trong danh sách.'}</Text><Button secondary title="Xem tất cả công việc" onPress={() => router.setParams({ taskId: '' })} /></Card>}
      <View>
        <Text style={s.title}>
          Một ngày làm việc tốt lành
        </Text>

        <Text style={[s.muted, { marginTop: 6 }]}>
          Theo dõi công việc, đồng hành cùng tổ của bạn.
        </Text>
        {!!summaryError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{summaryError}</Text>}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {stats.map(x => (
          <Pressable
            key={x.label}
            onPress={() => go(x.path)}
            style={[s.statCard, { width: 132 }]}
          >
            <Text style={s.muted}>
              {x.label}
            </Text>

            <Text
              style={s.statNumber}
            >
              {x.n}
            </Text>

            <Text style={[s.muted, { fontSize: 10 }]}>
              {x.sub}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={() => go('capture')}
        style={{
          backgroundColor: '#E4F0DE',
          borderRadius: 0,
          padding: 19,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.section}>
            {draft.photos.length
              ? `Tiếp tục bản nháp · ${draft.photos.length} ảnh`
              : 'Chụp ảnh & ghi nhật ký'}
          </Text>

          <Text style={s.muted}>
            Ghi nhận công việc bất cứ lúc nào
          </Text>
        </View>

        <Text style={s.link}>
          →
        </Text>
      </Pressable>

      <Section title="Công việc chủ nông trại giao" />
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}

      {ownerTasks.map(t => (
        <Card key={t.id}>
          <View style={s.row}>
            <Chip text="TỪ CHỦ NÔNG TRẠI" />

            <View style={{ flex: 1 }} />

            {t.status === 'done' ? <Status status={t.displayStatus} /> : t.started ? <Text style={[s.chip, s.chipText, { color: colors.warning, backgroundColor: colors.warningSoft }]}>Đang làm</Text> : null}
          </View>

          <Text style={s.section}>
            {t.title}
          </Text>

          <Text style={s.muted}>
            {t.area} · Hạn {dateText(t.due)}
          </Text>

          <Text
            style={{
              color: '#667C6D',
              fontSize: 13,
              lineHeight: 20
            }}
          >
            {t.instructions}
          </Text>

          {t.status !== 'done' && (
            <Button
              title={t.started ? 'Gửi nhật ký hoàn thành' : 'Bắt đầu'}
              onPress={() => {
                if (!t.started) { void startTask(t.id); return; }
                router.push({ pathname: '/(leader)/capture', params: { taskId: t.id, plotId: t.plotId, taskTitle: t.title, area: t.area } });
              }}
            />
          )}
        </Card>
      ))}

      <Section
        title="Công nhân đang hoạt động"
        action="Tất cả →"
        onPress={() => go('members')}
      />

      <Card>
        {active.map(m => (
          <Pressable
            key={m.id}
            onPress={() => go('member-detail', m.id)}
            style={[
              s.row,
              {
                paddingVertical: 6
              }
            ]}
          >
            <Avatar name={m.name} />

            <View style={{ flex: 1 }}>
              <Text style={s.name}>
                {m.name}
              </Text>

              <Text style={s.muted}>
                {m.area}
              </Text>
            </View>

            <View
              style={{
                width: 7,
                height: 7,
                backgroundColor: '#55A467',
                borderRadius: 4
              }}
            />

            <Text style={s.link}>
              ›
            </Text>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
