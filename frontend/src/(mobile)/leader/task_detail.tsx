import { getTaskTypeLabel } from '@/constants/task_types';
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { Card, Chip, dateText, Row, Screen, Status, s } from '@/components/leader/ui';
import { colors } from '@/styles/theme';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

function scheduleText(date?: string, time?: string) {
  return [time, date && dateText(date)].filter(Boolean).join(' · ') || 'Chưa có dữ liệu';
}

export default function LeaderTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { leaderTasks, loadTasks, ready, error } = useWorkSchedule();
  const task = leaderTasks.find(item => item.owner && item.id === id);

  useFocusEffect(useCallback(() => {
    void loadTasks();
  }, [loadTasks]));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/leader');
  };

  return (
    <Screen title="Chi tiết công việc" back onBack={goBack}>
      {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
      {!task ? (
        !ready && !error ? <ActivityIndicator color={colors.primary} /> :
          ready && !error && <Text style={s.muted}>Không tìm thấy công việc được giao.</Text>
      ) : (
        <>
          <Card>
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              <Chip text="Từ chủ nông trại" />
              {task.displayStatus === 'pending' && !task.started
                ? <Chip text="Đã nhận" />
                : <Status status={task.displayStatus === 'pending' ? 'in_progress' : task.displayStatus} />}
            </View>
            <Text style={s.title}>{getTaskTypeLabel(task.title)}</Text>
          </Card>

          <Card>
            <Row label="Khu vực" value={task.area || 'Chưa có dữ liệu'} />
            <Row label="Bắt đầu theo lịch" value={scheduleText(task.startDate, task.startTime)} />
            <Row label="Hạn hoàn thành" value={scheduleText(task.due, task.endTime)} />
          </Card>
        </>
      )}
    </Screen>
  );
}
