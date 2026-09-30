import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WorkerTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workerTasks, loadWorkerTasks } = useWorkSchedule();
  useFocusEffect(useCallback(() => {
    void loadWorkerTasks();
  }, [loadWorkerTasks]));
  const task = workerTasks.find(item => item.id === id);
  const dueDate = task?.due ? new Date(`${task.due}T00:00:00`) : null;
  const dueLabel = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString('vi-VN') : 'Chưa có dữ liệu';

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Chi tiết công việc
        </Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={shared.card}>
        {task?.started && <Text style={styles.status}>
          {task.status === 'done' ? (task.displayStatus === 'completed_late' ? 'Hoàn thành muộn' : 'Đã hoàn thành') : 'Đang làm'}
        </Text>}

        <Text style={styles.title}>
          {task?.title ?? 'Không tìm thấy công việc'}
        </Text>
        </View>
        <View style={styles.section}>
          <Row
            label="Khu vực"
            value={task?.area || 'Chưa có dữ liệu'}
          />

          <Row
            label="Hạn hoàn thành"
            value={dueLabel}
          />

          <Row
            label="Người giao việc"
            value={task?.leaderName || (task?.teamName ? `Tổ trưởng · ${task.teamName}` : 'Chưa có dữ liệu')}
          />

          <Row
            label="Công cụ / vật tư"
            value={task?.tools || 'Không yêu cầu'}
          />
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            Ghi chú / hướng dẫn
          </Text>

          <Text style={styles.noteText}>
            {task?.instructions || 'Chưa có lưu ý.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...shared.page },

  header: { ...shared.header },

  back: { ...shared.backText },

  headerTitle: { ...shared.title, flex: 1 },

  content: { ...shared.content },

  status: { ...shared.chip, ...shared.chipText, backgroundColor: colors.warningSoft, color: colors.warning },

  title: { ...shared.title },

  section: { ...shared.card },

  row: { ...shared.infoRow, alignItems: "center" },

  label: { ...shared.muted, flex: 1 },

  value: { ...shared.value },

  note: { ...shared.card },

  noteTitle: { ...shared.section },

  noteText: { ...shared.body },
});
