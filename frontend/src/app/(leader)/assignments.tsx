import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLeader } from '@/contexts/leader-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { Button, Card, Chip, dateText, Screen, Section, s } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';
import { inJournalPeriod, journalPeriods, type JournalPeriod } from '@/sevices/journal-filter';
import { colors } from '@/styles/theme';

export default function AssignmentsScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks } = useLeader();
  const { error, retry } = useWorkSchedule();
  useFocusEffect(useCallback(() => { void retry(); }, [retry]));
  const [period, setPeriod] = useState<JournalPeriod>('today');
  const [limit, setLimit] = useState(10);

  const assigned = tasks.filter(task => !task.owner && (!taskId || task.id === taskId));
  const filtered = taskId ? assigned : assigned.filter(task => inJournalPeriod(task.startDate ?? task.due, period));
  const visible = filtered.slice(0, limit);

  useEffect(() => { setLimit(10); }, [period, taskId]);

  return (
    <Screen
      title="Quản lý giao việc"
      titleAction={<Button title="+ Giao việc" onPress={() => router.push('/(leader)/create-assignment')} />}
    >
      {!!taskId && <Button secondary title="Xem tất cả phân công" onPress={() => router.setParams({ taskId: '' })} />}
      {!!taskId && !assigned.length && <Text style={s.muted}>Công việc này không còn trong danh sách.</Text>}
      <Feedback text={error} />
      {!!error && <Button title="Tải lại lịch" onPress={retry} />}

      {!taskId && <View style={[s.row, { gap: 6 }]}>
        {[...journalPeriods.filter(item => item.value !== 'all'), ...journalPeriods.filter(item => item.value === 'all')].map(item => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: period === item.value }}
            onPress={() => setPeriod(item.value)}
            style={[s.secondary, { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 2, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }, period === item.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
          >
            <Text style={[period === item.value ? s.link : s.muted, { textAlign: 'center' }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>}

      <Section title="Lịch sử giao việc" />
      {!visible.length && <Text style={s.empty}>Không có lần giao việc nào trong khoảng thời gian này.</Text>}

      {visible.map(task => {
        const assignees = task.memberIds.map(id => ({
          id,
          name: task.assigneeStatuses?.[id]?.name || members.find(member => member.id === id)?.name || 'Công nhân',
          completed: task.assigneeStatuses?.[id]?.completed ?? false,
        }));
        return (
          <Card key={task.id}>
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <Text style={[s.section, { flex: 1, paddingTop: 5 }]}>{task.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chỉnh sửa công việc ${task.title}`}
                onPress={() => router.push({ pathname: '/(leader)/edit-assignment', params: { id: task.id } })}
                style={[s.secondary, { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }]}
              >
                <Text style={s.link}>Chỉnh sửa</Text>
              </Pressable>
            </View>
            <View style={[s.row, { alignItems: 'center' }]}>
              <Text style={[s.muted, { flex: 1, flexShrink: 1 }]}>Giao {dateText(task.startDate ?? task.due)} · Hạn {dateText(task.due)}</Text>
            </View>
            <Text style={s.label}>Khu vực: {task.area}</Text>
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Người thực hiện</Text>
              {assignees.map(member => (
                <View key={member.id} style={s.row}>
                  <Text style={[s.body, { flex: 1 }]}>• {member.name}</Text>
                  <Chip text={member.completed ? 'Hoàn thành' : 'Đang làm'} tone={member.completed ? 'green' : 'amber'} />
                </View>
              ))}
            </View>
            {!!task.tools && <Text style={s.muted}>Công cụ/vật tư: {task.tools}</Text>}
            {!!task.instructions && <Text style={s.body}>{task.instructions}</Text>}
          </Card>
        );
      })}

      {visible.length < filtered.length && <Button secondary title="Xem thêm lần giao việc" onPress={() => setLimit(value => value + 10)} />}
      {!!filtered.length && visible.length === filtered.length && filtered.length > 10 && <Text style={s.muted}>Đã hiển thị toàn bộ lịch sử giao việc.</Text>}
    </Screen>
  );
}
