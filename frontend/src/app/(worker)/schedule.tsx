import { router, type Href, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useReports } from '@/contexts/report-context';
import { PriorityBadge, priorityOrder } from '@/components/common/task-priority';
import { Button } from '@/components/common/role-ui';
import { sharedStyles as shared } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function shift(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function weekStart(date: Date) { return shift(date, -((date.getDay() + 6) % 7)); }
const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export default function WorkerScheduleScreen() {
  const { date, taskId } = useLocalSearchParams<{ date?: string; taskId?: string }>();
  const { user } = useAuth();
  const { workerTasks, ready, error, retry } = useWorkSchedule();
  const { drafts, reports } = useReports();
  const [selected, setSelected] = useState(() => new Date());
  useEffect(() => {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const value = new Date(date + 'T12:00:00');
      if (!Number.isNaN(value.getTime())) setSelected(value);
    }
  }, [date]);
  const days = Array.from({ length: 7 }, (_, index) => shift(weekStart(selected), index));
  const selectedKey = dateKey(selected);
  const jobs = workerTasks.filter(task => task.due === selectedKey || reports.find(r => r.taskId === task.id)?.review === 'rejected')
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99') || priorityOrder[a.priority] - priorityOrder[b.priority]);
  return <SafeAreaView style={shared.page} edges={['top']}>
    <View style={shared.header}>
      <Pressable accessibilityLabel="Quay lại" hitSlop={10} onPress={() => router.back()}><Text style={shared.backText}>‹</Text></Pressable>
      <Text style={[shared.section, { flex: 1 }]}>Lịch làm việc</Text>
      <Pressable accessibilityRole="button" onPress={() => setSelected(new Date())}><Text style={shared.link}>Hôm nay</Text></Pressable>
    </View>
    <View style={s.calendar}>
      <View style={shared.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tuần trước" hitSlop={10} onPress={() => setSelected(old => shift(old, -7))}><Text style={s.arrow}>‹</Text></Pressable>
        <Text style={[shared.label, { flex: 1, textAlign: 'center' }]}>{days[0].toLocaleDateString('vi-VN')} – {days[6].toLocaleDateString('vi-VN')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tuần sau" hitSlop={10} onPress={() => setSelected(old => shift(old, 7))}><Text style={s.arrow}>›</Text></Pressable>
      </View>
      <View style={s.week}>{days.map((day, index) => {
        const key = dateKey(day), active = key === selectedKey;
        const hasWork = workerTasks.some(task => task.due === key);
        return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${dayLabels[index]}, ${day.toLocaleDateString('vi-VN')}${hasWork ? ', có công việc' : ''}`}
          style={[s.day, active && s.selected]} onPress={() => setSelected(day)}>
          <Text style={[shared.muted, active && s.white]}>{dayLabels[index]}</Text>
          <Text style={[shared.section, active && s.white]}>{day.getDate()}</Text>
          <View style={[s.dot, { opacity: hasWork ? 1 : 0, backgroundColor: active ? colors.white : colors.primary }]} />
        </Pressable>;
      })}</View>
    </View>
    <ScrollView contentContainerStyle={shared.content}>
      <Text style={shared.muted}>Ngày {selected.toLocaleDateString('vi-VN')} · {jobs.length} công việc</Text>
      {!user ? <Text style={shared.empty}>Vui lòng đăng nhập để xem lịch của bạn.</Text>
        : error ? <View style={shared.card}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text><Button title="Thử lại" onPress={retry} /></View>
        : !ready ? <ActivityIndicator color={colors.primary} />
        : !jobs.length ? <View style={shared.card}><Text style={shared.section}>Tổ trưởng chưa giao việc</Text><Text style={shared.muted}>Chưa có lịch làm việc cho ngày đã chọn.</Text></View>
        : jobs.map(task => {
          const latest = reports.find(item => item.taskId === task.id);
          const report = latest?.review === 'rejected' ? undefined : latest;
          const draft = drafts[`task:${task.id}`];
          return <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`${task.title}, ${report ? 'xem báo cáo' : 'mở bản nháp báo cáo'}`}
            style={({ pressed }) => [shared.card, task.id === taskId && { borderColor: colors.primary, borderWidth: 2 }, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(report
              ? { pathname: '/(worker)/diary-detail', params: { id: report.id } } as Href
              : { pathname: '/(worker)/report-note', params: { taskId: task.id, taskTitle: task.title, area: task.area } } as Href)}>
            <View style={shared.row}><Text style={[shared.link, { flex: 1 }]}>{task.startTime && task.endTime ? `${task.startTime} – ${task.endTime}` : 'Chưa đặt giờ làm việc'}</Text><PriorityBadge priority={task.priority} /></View>
            <Text style={shared.section}>{task.title}</Text>
            {latest?.review === 'rejected' && <Text style={{ color: colors.danger }}>Không đạt · Cần làm lại và gửi báo cáo mới</Text>}
            <Text style={shared.muted}>⌖ {task.area}</Text>
            {!!task.tools && <Text style={shared.muted}>Công cụ: {task.tools}</Text>}
            {!!task.instructions && <Text style={shared.body}>{task.instructions}</Text>}
            <Text style={shared.link}>{report ? 'Đã gửi báo cáo · Xem nhật ký →' : draft ? 'Tiếp tục bản nháp báo cáo →' : 'Chụp ảnh & báo cáo công việc →'}</Text>
          </Pressable>;
        })}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  calendar: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border },
  week: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 3, borderRadius: 13 },
  selected: { backgroundColor: colors.primary },
  white: { color: colors.white },
  dot: { width: 4, height: 4, borderRadius: 2 },
  arrow: { color: colors.primary, fontSize: 28, paddingHorizontal: 8 },
});
