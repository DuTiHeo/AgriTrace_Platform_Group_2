import { getTaskTypeLabel } from '@/constants/task_types';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLeader } from "@/contexts/leader_context";
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { colors } from '@/styles/theme';
import { useAuth } from '@/contexts/auth_context';
import { localToday } from '@/contexts/notification_context';
import { listLogs, type FarmingLog } from '@/sevices/farming_log.service';
import { inJournalPeriod } from '@/sevices/journal_filter';
import { Avatar, Button, Card, dateText, go, Screen, Section, s, Status } from "@/components/leader/ui";

export default function HomeScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks, draft, loadMembers } = useLeader();
  const { startTask, loadTasks, leaderTasks, error } = useWorkSchedule();
  const { accessToken } = useAuth();
  const [today, setToday] = useState(localToday);
  const [summaryLogs, setSummaryLogs] = useState<FarmingLog[]>([]);
  const [summaryError, setSummaryError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let refreshing = false;

      setSummaryLogs([]);

      const refreshSummary = async () => {
        setToday(localToday());

        if (refreshing || !accessToken) return;

        refreshing = true;

        try {
          const [logs] = await Promise.all([
            listLogs(accessToken),
            loadTasks(),
            loadMembers()
          ]);

          if (active) {
            setSummaryLogs(logs);
            setSummaryError('');
          }
        } catch {
          if (active) {
            setSummaryError('Không tải được số nhật ký hôm nay.');
          }
        } finally {
          refreshing = false;
        }
      };

      void refreshSummary();

      const timer = setInterval(() => {
        void refreshSummary();
      }, 30000);

      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') void refreshSummary();
      });

      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [accessToken, loadTasks, loadMembers])
  );

  const ownerTasks = tasks.filter(
    t => t.owner && (!taskId || t.id === taskId)
  );

  const active = members.filter(m => m.active);

  const stats = [
    {
      n: active.length,
      label: 'Đang hoạt động',
      sub: `${members.length} thành viên`,
      path: 'members'
    },
    {
      n: summaryError
        ? '—'
        : summaryLogs.filter(log =>
            inJournalPeriod(
              log.logged_at,
              'today',
              new Date(`${today}T12:00:00`)
            )
          ).length,
      label: 'Nhật ký hôm nay',
      sub: 'Cập nhật từ tổ',
      path: 'diary'
    },
    {
      n: tasks.filter(
        t =>
          t.status !== 'done' &&
          (t.startDate || t.due) <= today &&
          t.due >= today
      ).length,
      label: 'Việc cần làm',
      sub: 'Trong hôm nay',
      path: 'assignments'
    },
    {
      n: leaderTasks.filter(
        t =>
          t.status === 'done' &&
          !!t.updatedAt &&
          inJournalPeriod(
            t.updatedAt,
            'today',
            new Date(`${today}T12:00:00`)
          )
      ).length,
      label: 'Đã hoàn thành',
      sub: 'Hoàn thành hôm nay',
      path: 'assignments'
    }
  ];

  return (
    <Screen>
      {!!taskId && (
        <Card>
          <Text style={s.section}>
            Công việc từ thông báo
          </Text>

          <Text style={s.muted}>
            {getTaskTypeLabel(ownerTasks[0]?.title ?? 'Công việc không còn trong danh sách.')}
          </Text>

          <Button
            secondary
            title="Xem tất cả công việc"
            onPress={() => router.setParams({ taskId: '' })}
          />
        </Card>
      )}

      <View>
        <Text style={s.title}>
          Một ngày làm việc tốt lành
        </Text>

        <Text style={[s.muted, { marginTop: 6 }]}>
          Theo dõi công việc, đồng hành cùng tổ của bạn.
        </Text>

        {!!summaryError && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.danger }}
          >
            {summaryError}
          </Text>
        )}
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

            <Text style={s.statNumber}>
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

      <View style={styles.taskSection}>
        <View style={styles.taskHeading}>
          <Text style={styles.taskName}>Công việc được giao cho bạn</Text>
          <Text style={[s.chip, s.chipText]}>{ownerTasks.length} nhiệm vụ</Text>
        </View>

        {!!error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}

        {!error && !ownerTasks.length && (
          <Text style={s.muted}>Chưa có công việc được giao.</Text>
        )}

        {ownerTasks.map(task => {
          const status = task.started && task.displayStatus === 'pending'
            ? 'in_progress'
            : task.displayStatus;

          return (
            <Card key={task.id}>
              <View style={s.row}>
                <Text style={styles.taskName}>{getTaskTypeLabel(task.title)}</Text>
                {status === 'pending' ? (
                  <Text style={[s.chip, s.chipText, styles.received]}>Đã nhận</Text>
                ) : (
                  <Status status={status} />
                )}
              </View>

              <Text style={s.muted}>{task.area} · Hạn: {dateText(task.due)}</Text>

              <View style={styles.actions}>
                {task.status !== 'done' && (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.primaryAction}
                    onPress={() => {
                      if (!task.started) {
                        void startTask(task.id);
                        return;
                      }

                      router.push({
                        pathname: '/leader/capture',
                        params: {
                          taskId: task.id,
                          plotId: task.plotId,
                          taskTitle: task.title,
                          area: task.area
                        }
                      });
                    }}
                  >
                    <Text style={styles.actionText}>
                      {task.started ? 'Gửi nhật ký hoàn thành' : 'Bắt đầu'}
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  accessibilityRole="button"
                  style={[s.button, s.secondary]}
                  onPress={() => router.navigate({ pathname: '/leader/task_detail', params: { id: task.id } })}
                >
                  <Text style={s.link}>Chi tiết</Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </View>

      <Section
        title="Công nhân đang hoạt động"
        action="Tất cả →"
        onPress={() => go('members')}
      />

      <Card>
        {active.map(m => (
          <Pressable
            key={m.id}
            onPress={() => go('member_detail', m.id)}
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
const styles = StyleSheet.create({
  taskSection: { gap: 12 },
  taskHeading: { ...s.row, justifyContent: 'space-between', paddingBottom: 10 },
  taskName: { ...s.section, flex: 1 },
  received: { color: colors.muted, backgroundColor: '#EFF2F0' },
  actions: { ...s.row, flexWrap: 'wrap' },
  primaryAction: { ...s.button, flex: 1 },
  actionText: { ...s.buttonText, textAlign: 'center' }
});
