import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { type Href, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReports } from '@/contexts/report-context';
import { WorkerHeader } from '@/components/worker/worker-header';

function localDateKey(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function occursOn(task: { startDate?: string; due: string }, day: string) {
  const start = task.startDate || task.due;
  return !!start && !!task.due && start <= day && day <= task.due;
}

export default function WorkerHome() {
  const { reports } = useReports();
  const { workerTasks, loadWorkerTasks, startTask, error } = useWorkSchedule();
  const [today, setToday] = useState(() => localDateKey(new Date().toISOString()));
  useFocusEffect(useCallback(() => {
    const updateDay = () => setToday(localDateKey(new Date().toISOString()));
    updateDay();
    void loadWorkerTasks();
    const timer = setInterval(() => { updateDay(); void loadWorkerTasks(); }, 10000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { updateDay(); void loadWorkerTasks(); }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [loadWorkerTasks]));
  const tasks = workerTasks.filter(task => task.status !== 'done' && occursOn(task, today));
  const completedToday = workerTasks.filter(task => task.status === 'done' && localDateKey(task.updatedAt) === today);
  const todayTotal = tasks.length + completedToday.length;
  const reportsToday = reports.filter(report => localDateKey(report.completedAt) === today);
  const rework = workerTasks.filter(t => reports.find(r => r.taskId === t.id)?.review === 'rejected');


  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <WorkerHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={shared.muted}>Hôm nay · {today.split('-').reverse().join('/')}</Text>
        {rework.length > 0 && <View style={shared.card}>
          <Text style={shared.section}>Công việc cần làm lại ({rework.length})</Text>
          {rework.map(task => <Pressable key={task.id} onPress={() => router.push({ pathname: '/(worker)/report-note', params: { taskId: task.id, plotId: task.plotId, taskTitle: task.title, area: task.area } } as Href)}>
            <Text style={{ color: colors.danger }}>{task.title} · Không đạt</Text>
            <Text style={shared.link}>Chụp ảnh và gửi lại báo cáo →</Text>
          </Pressable>)}
        </View>}
        <View style={styles.summaryRow}>
          <Summary
            number={todayTotal}
            label="Việc hôm nay"
          />

          <Summary
            number={tasks.length}
            label="Chưa xong"
          />

          <Summary
            number={completedToday.length}
            label="Đã xong"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Công việc hôm nay
            </Text>

            <Text style={styles.count}>
              {tasks.length} nhiệm vụ
            </Text>
          </View>

          {!tasks.length && <Text style={styles.meta}>Hôm nay không còn công việc nào cần làm.</Text>}
          {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}

          {tasks.map((task) => (
            <View
              key={task.id}
              style={styles.taskCard}
            >
              <View style={styles.taskTop}>
                <Text style={styles.taskName}>
                  {task.title}
                </Text>

                {task.started && <Text style={[shared.chip, shared.chipText, { color: colors.warning, backgroundColor: colors.warningSoft }]}>Đang làm</Text>}
              </View>

              <Text style={styles.meta}>
                {task.area} · Hạn: {task.due}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.actionButton,
                    task.status === 'doing' &&
                      styles.completeButton
                  ]}
                  accessibilityRole="button"
                  onPress={() => {
                    if (!task.started) { void startTask(task.id); return; }
                    router.push({ pathname: '/(worker)/report-note', params: { taskId: String(task.id), plotId: task.plotId, taskTitle: task.title, area: task.area } } as Href);
                  }}
                >
                  <Text style={styles.actionText}>
                    {task.started ? 'Gửi nhật ký hoàn thành' : 'Bắt đầu'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.detailButton}
                  onPress={() =>
                    router.push(
                      { pathname: '/(worker)/task-detail', params: { id: task.id } } as Href
                    )
                  }
                >
                  <Text style={styles.detailText}>
                    Chi tiết
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Báo cáo đã ghi nhận hôm nay ({reportsToday.length})
            </Text>
          </View>

          {!reportsToday.length && <Text style={styles.meta}>Hôm nay chưa có báo cáo được ghi nhận.</Text>}
          {reportsToday.map(report => (
            <Pressable key={report.id} style={styles.completedRow}
              onPress={() => router.push({ pathname: '/(worker)/diary-detail', params: { id: report.id, fromNotification: 'false' } } as Href)}>
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
