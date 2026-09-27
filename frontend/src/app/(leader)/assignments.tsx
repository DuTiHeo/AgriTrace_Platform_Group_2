import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLeader } from '@/contexts/leader-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { Avatar, Button, Card, dateText, go, Screen, Section, s, Status } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';
import { inJournalPeriod, journalPeriods, type JournalPeriod } from '@/sevices/journal-filter';
import { colors } from '@/styles/theme';

export default function AssignmentsScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks } = useLeader();
  const { error, retry } = useWorkSchedule();
  const [period, setPeriod] = useState<Exclude<JournalPeriod, 'all'>>('today');
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

      {!taskId && <View style={[s.row, { flexWrap: 'wrap' }]}>
        {journalPeriods.filter(item => item.value !== 'all').map(item => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: period === item.value }}
            onPress={() => setPeriod(item.value as Exclude<JournalPeriod, 'all'>)}
            style={[s.secondary, { paddingHorizontal: 11, paddingVertical: 8 }, period === item.value && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
          >
            <Text style={period === item.value ? s.link : s.muted}>{item.label}</Text>
          </Pressable>
        ))}
      </View>}

      <Section title="Các lần giao việc" />
      {!visible.length && <Text style={s.empty}>Không có lần giao việc nào trong khoảng thời gian này.</Text>}

      {visible.map(task => {
        const assignees = members.filter(member => task.memberIds.includes(member.id));
        return (
          <Card key={task.id}>
            <View style={s.row}>
              <Text style={[s.section, { flex: 1 }]}>{task.title}</Text>
              <Status status={task.status} />
            </View>
            <Text style={s.muted}>Giao ngày {dateText(task.startDate ?? task.due)} · Hạn {dateText(task.due)}</Text>
            <Text style={s.label}>Khu vực: {task.area}</Text>
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Người thực hiện</Text>
              {assignees.map(member => (
                <Pressable key={member.id} style={s.row} onPress={() => go('member-detail', member.id)}>
                  <Avatar name={member.name} small />
                  <Text style={[s.link, { flex: 1 }]}>{member.name}</Text>
                  <Text style={s.link}>Chi tiết ›</Text>
                </Pressable>
              ))}
            </View>
            {!!task.startTime && !!task.endTime && <Text style={s.muted}>Thời gian: {task.startTime}–{task.endTime}</Text>}
            {!!task.tools && <Text style={s.muted}>Công cụ/vật tư: {task.tools}</Text>}
            {!!task.instructions && <Text style={s.body}>{task.instructions}</Text>}
          </Card>
        );
      })}

      {visible.length < filtered.length && <Button secondary title="Xem thêm lần giao việc" onPress={() => setLimit(value => value + 10)} />}
      {!!filtered.length && visible.length === filtered.length && filtered.length > 10 && <Text style={s.muted}>Đã hiển thị toàn bộ các lần giao việc.</Text>}
    </Screen>
  );
}
