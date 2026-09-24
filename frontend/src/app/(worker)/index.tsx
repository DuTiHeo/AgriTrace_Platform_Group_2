import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { Status } from '@/components/common/role-ui';
import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReports } from '@/contexts/report-context';
import { WorkerHeader } from '@/components/worker/worker-header';

type TaskStatus = 'todo' | 'doing';

type Task = {
  id: number;
  title: string;
  area: string;
  due: string;
  status: TaskStatus;
  priority: 'high' | 'normal';
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Kiểm tra sâu bệnh',
    area: 'KV-B',
    due: '17/09',
    status: 'doing',
    priority: 'high'
  },
  {
    id: 2,
    title: 'Tưới nước hằng ngày',
    area: 'KV-A',
    due: '17/09',
    status: 'todo',
    priority: 'high'
  },
  {
    id: 3,
    title: 'Phun thuốc trừ sâu',
    area: 'KV-A',
    due: '20/09',
    status: 'todo',
    priority: 'normal'
  },
];

export default function WorkerHome() {
  const [tasks, setTasks] = useState(initialTasks);
  const { reports } = useReports();
  const { workerTasks } = useWorkSchedule();
  const rework = workerTasks.filter(t => reports.find(r => r.taskId === t.id)?.review === 'rejected');

  const doing = tasks.filter(
    (task) => task.status === 'doing'
  ).length;

  const startTask = (id: number) =>
    setTasks((items) =>
      items.map((task) =>
        task.id === id
          ? { ...task, status: 'doing' }
          : task
      )
    );

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {rework.length > 0 && <View style={shared.card}>
          <Text style={shared.section}>Công việc cần làm lại ({rework.length})</Text>
          {rework.map(task => <Pressable key={task.id} onPress={() => router.push({ pathname: '/(worker)/report-note', params: { taskId: task.id, taskTitle: task.title, area: task.area } } as Href)}>
            <Text style={{ color: colors.danger }}>{task.title} · Không đạt</Text>
            <Text style={shared.link}>Chụp ảnh và gửi lại báo cáo →</Text>
          </Pressable>)}
        </View>}
        <View style={styles.summaryRow}>
          <Summary
            number={
              tasks.filter(
                (task) => task.status === 'todo'
              ).length
            }
            label="Cần làm"
          />

          <Summary
            number={doing}
            label="Đang làm"
          />

          <Summary
            number={1}
            label="Đã xong"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              📋 Công việc được giao
            </Text>

            <Text style={styles.count}>
              3 nhiệm vụ
            </Text>
          </View>

          {tasks.map((task) => (
            <View
              key={task.id}
              style={styles.taskCard}
            >
              <View style={styles.taskTop}>
                <Text style={styles.taskName}>
                  <Text
                    style={{
                      color:
                        task.priority === 'high'
                          ? colors.danger
                          : colors.warning
                    }}
                  >
                    ●{' '}
                  </Text>

                  {task.title}
                </Text>

                <Status status={task.status} />
              </View>

              <Text style={styles.meta}>
                🗺️ {task.area} · ⏰ Hạn: {task.due}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.actionButton,
                    task.status === 'doing' &&
                      styles.completeButton
                  ]}
                  onPress={() =>
                    task.status === 'doing'
                      ? router.push(
                          { pathname: '/(worker)/report-note', params: { taskTitle: task.title, area: task.area } } as Href
                        )
                      : startTask(task.id)
                  }
                >
                  <Text style={styles.actionText}>
                    {task.status === 'doing'
                      ? '✓ Hoàn thành (Chụp ảnh)'
                      : '▶ Bắt đầu làm'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.detailButton}
                  onPress={() =>
                    router.push(
                      '/(worker)/task-detail' as Href
                    )
                  }
                >
                  <Text style={styles.detailText}>
                    📋 Chi tiết
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              ✅ Báo cáo đã ghi nhận ({reports.length})
            </Text>
          </View>

          {!reports.length && <Text style={styles.meta}>Chưa có báo cáo được ghi nhận.</Text>}
          {reports.map(report => (
            <Pressable key={report.id} style={styles.completedRow}
              onPress={() => router.push({ pathname: '/(worker)/diary-detail', params: { id: report.id } } as Href)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedTitle}>{report.taskTitle}</Text>
                <Text style={styles.meta}>{report.area} · {report.completedAt}</Text>
              </View>
              <Text style={styles.done}>Xem →</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({
  number,
  label
}: {
  number: number;
  label: string;
}) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryNumber}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { ...shared.page },

  content: { ...shared.content },

  summaryRow: {
    flexDirection: 'row',
    gap: 10
  },

  summary: { ...shared.statCard, flex: 1, paddingHorizontal: 8 },

  summaryNumber: { ...shared.statNumber },

  summaryLabel: { ...shared.muted },

  section: { gap: 12 },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10
  },

  sectionTitle: { ...shared.section, flexShrink: 1 },

  count: { ...shared.chip, ...shared.chipText },

  taskCard: { ...shared.card },

  taskTop: { ...shared.row },

  taskName: { ...shared.section, flex: 1 },

  status: { ...shared.chip, ...shared.chipText },

  meta: { ...shared.muted },

  actions: { ...shared.row, flexWrap: "wrap" },

  actionButton: { ...shared.button, flex: 1 },

  completeButton: { backgroundColor: colors.primary },

  actionText: { ...shared.buttonText, textAlign: "center" },

  detailButton: { ...shared.button, ...shared.secondary },

  detailText: { ...shared.link },

  completedRow: { ...shared.card, flexDirection: "row", alignItems: "center" },

  completedTitle: { ...shared.section },

  done: { ...shared.link },
});