import { localDateKey, taskOccursOn as occursOn } from '@/utils/task_dates';
import { getTaskTypeLabel } from '@/constants/task_types';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth_context';
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { useReports } from '@/contexts/report_context';
import { taskExecutionError } from '@/sevices/journal_filter';
import { Button } from '@/components/common/role_ui';
import { sharedStyles as shared } from '@/styles/role_styles';
import { colors } from '@/styles/theme';
import { useTaskRefresh } from '@/hooks/use_task_refresh';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayDate() { return new Date(localDateKey(new Date()) + 'T12:00:00'); }

function shift(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function weekStart(date: Date) {
  return shift(date, -((date.getDay() + 6) % 7));
}

const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function scheduleDate(value: string | undefined) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00');
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function WorkerScheduleScreen() {
  const { date, taskId } = useLocalSearchParams<{ date?: string; taskId?: string }>();
  const { user } = useAuth();
  const { workerTasks, ready, error, retry, startTask } = useWorkSchedule();
  const [actionError, setActionError] = useState<{ taskId: string; message: string } | null>(null);
  const { reports } = useReports();
  const [selected, setSelected] = useState(() => scheduleDate(date) ?? todayDate());
  const [previousDate, setPreviousDate] = useState(date);
  if (previousDate !== date) {
    setPreviousDate(date);
    const value = scheduleDate(date);
    if (value) setSelected(value);
  }
  const [refreshing, setRefreshing] = useState(false);
  useTaskRefresh(retry);
  const refreshSchedule = useCallback(async () => {
    setRefreshing(true);
    try { await retry(); } finally { setRefreshing(false); }
  }, [retry]);

  const days = Array.from(
    { length: 7 },
    (_, index) => shift(weekStart(selected), index)
  );

  const selectedKey = dateKey(selected);

  const jobs = workerTasks
    .filter(task => task.status !== 'done' && occursOn(task, selectedKey))
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <SafeAreaView style={shared.page} edges={['top']}>
      <View style={shared.header}>
        <Pressable
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Text style={shared.backText}>‹</Text>
        </Pressable>

        <Text style={[shared.section, { flex: 1 }]}>
          Lịch làm việc
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSelected(todayDate())}
        >
          <Text style={shared.link}>
            Hôm nay
          </Text>
        </Pressable>
      </View>

      <View style={s.calendar}>
        <View style={shared.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tuần trước"
            hitSlop={10}
            onPress={() => setSelected(old => shift(old, -7))}
          >
            <Text style={s.arrow}>‹</Text>
          </Pressable>

          <Text style={[shared.label, { flex: 1, textAlign: 'center' }]}>
            {days[0].toLocaleDateString('vi-VN')} – {days[6].toLocaleDateString('vi-VN')}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tuần sau"
            hitSlop={10}
            onPress={() => setSelected(old => shift(old, 7))}
          >
            <Text style={s.arrow}>›</Text>
          </Pressable>
        </View>

        <View style={s.week}>
          {days.map((day, index) => {
            const key = dateKey(day), active = key === selectedKey;
            const hasWork = workerTasks.some(task => task.status !== 'done' && occursOn(task, key));

            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${dayLabels[index]}, ${day.toLocaleDateString('vi-VN')}${hasWork ? ', có công việc' : ''}`}
                style={[s.day, active && s.selected]}
                onPress={() => setSelected(day)}
              >
                <Text style={[shared.muted, active && s.white]}>
                  {dayLabels[index]}
                </Text>

                <Text style={[shared.section, active && s.white]}>
                  {day.getDate()}
                </Text>

                <View
                  style={[
                    s.dot,
                    {
                      opacity: hasWork ? 1 : 0,
                      backgroundColor: active ? colors.white : colors.primary
                    }
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={shared.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refreshSchedule(); }} colors={[colors.primary]} />}>
        <Text style={shared.muted}>
          Ngày {selected.toLocaleDateString('vi-VN')} · {jobs.length} công việc
        </Text>


        {!user ? (
          <Text style={shared.empty}>
            Vui lòng đăng nhập để xem lịch của bạn.
          </Text>
        ) : error ? (
          <View style={shared.card}>
            <Text
              accessibilityRole="alert"
              style={{ color: colors.danger }}
            >
              {error}
            </Text>

            <Button
              title="Thử lại"
              onPress={retry}
            />
          </View>
        ) : !ready ? (
          <ActivityIndicator color={colors.primary} />
        ) : !jobs.length ? (
          <View style={shared.card}>
            <Text style={shared.section}>
              Không có công việc trong ngày này
            </Text>

            <Text style={shared.muted}>
              Chưa có lịch làm việc cho ngày đã chọn.
            </Text>
          </View>
        ) : (
          jobs.map(task => {
            const latest = reports.find(item => item.taskId === task.id);

            return (
              <View
                key={task.id}
                style={[
                  shared.card,
                  task.id === taskId && { borderColor: colors.primary, borderWidth: 2 }
                ]}
              >
                <View style={shared.row}>
                  <Text style={[shared.link, { flex: 1 }]}>
                    Hạn hoàn thành: {task.due}
                  </Text>

                  {task.displayStatus === 'incomplete' ? (
                    <Text
                      style={[
                        shared.chip,
                        shared.chipText,
                        {
                          color: colors.danger,
                          backgroundColor: '#fef2f2'
                        }
                      ]}
                    >
                      Chưa hoàn thành
                    </Text>
                  ) : (task.displayStatus === 'in_progress' || task.started) ? (
                    <Text
                      style={[
                        shared.chip,
                        shared.chipText,
                        {
                          color: colors.warning,
                          backgroundColor: colors.warningSoft
                        }
                      ]}
                    >
                      Đang làm
                    </Text>
                  ) : (task.displayStatus === 'completed' || task.displayStatus === 'completed_late') ? (
                    <Text
                      style={[
                        shared.chip,
                        shared.chipText,
                        {
                          color: colors.success,
                          backgroundColor: colors.successSoft
                        }
                      ]}
                    >
                      Đã hoàn thành
                    </Text>
                  ) : (
                    <Text
                      style={[
                        shared.chip,
                        shared.chipText,
                        {
                          color: colors.muted,
                          backgroundColor: '#EFF2F0'
                        }
                      ]}
                    >
                      Đã nhận
                    </Text>
                  )}
                </View>

                <Text style={shared.section}>
                  {getTaskTypeLabel(task.title)}
                </Text>

                {latest?.review === 'rejected' && (
                  <Text style={{ color: colors.danger }}>
                    Không đạt · Cần làm lại và gửi báo cáo mới
                  </Text>
                )}

                <Text style={shared.muted}>
                  ⌖ {task.area}
                </Text>

                {!!task.tools && (
                  <Text style={shared.muted}>
                    Công cụ: {task.tools}
                  </Text>
                )}

                {!!task.instructions && (
                  <Text style={shared.body}>
                    {task.instructions}
                  </Text>
                )}

                {actionError?.taskId === task.id && (
                  <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError.message}</Text>
                )}
                <View style={[shared.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
                  {(latest?.review === 'rejected' || (task.status !== 'done' && !latest)) && (
                    <Pressable
                      accessibilityRole="button"
                      style={shared.button}
                      onPress={() => {
                        const message = taskExecutionError(task);
                        setActionError(message ? { taskId: task.id, message } : null);
                        if (message) return;

                        if (!task.started) {
                          void startTask(task.id);
                          return;
                        }

                        router.navigate({
                          pathname: '/worker/report_note',
                          params: { taskId: task.id, plotId: task.plotId, taskTitle: task.title, area: task.area }
                        });
                      }}
                    >
                      <Text style={shared.buttonText}>{task.started ? 'Hoàn thành' : 'Bắt đầu'}</Text>
                    </Pressable>
                  )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chi tiết ${getTaskTypeLabel(task.title)}`}
                  style={[shared.button, shared.secondary, { marginLeft: 'auto' }]}
                  onPress={() => router.navigate({ pathname: '/worker/task_detail', params: { id: task.id } })}
                >
                  <Text style={shared.link}>Chi tiết</Text>
                </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  calendar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border
  },

  week: {
    flexDirection: 'row',
    gap: 4
  },

  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 3,
    borderRadius: 0
  },

  selected: {
    backgroundColor: colors.primary
  },

  white: {
    color: colors.white
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2
  },

  arrow: {
    color: colors.primary,
    fontSize: 28,
    paddingHorizontal: 8
  },
});
