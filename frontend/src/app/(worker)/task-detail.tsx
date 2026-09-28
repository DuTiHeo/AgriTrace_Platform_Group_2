import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { workerTasks } = useWorkSchedule();
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
        <Text style={styles.status}>
          {task?.status === 'done' ? 'Đã xong' : 'Đang làm'}
        </Text>

        <Text style={styles.title}>
          {task?.title ?? 'Không tìm thấy công việc'}
        </Text>

        <Text style={styles.description}>
          {task?.instructions || 'Chưa có mô tả công việc.'}
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
            label="Người giao"
            value={task?.teamName ? `Tổ trưởng ${task.teamName}` : 'Chưa có dữ liệu'}
          />

        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            Lưu ý từ tổ trưởng
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

  description: { ...shared.body },

  section: { ...shared.card },

  row: { ...shared.infoRow, alignItems: "center" },

  label: { ...shared.muted, flex: 1 },

  value: { ...shared.value },

  note: { ...shared.card },

  noteTitle: { ...shared.section },

  noteText: { ...shared.body },
});
