import { isValidDateKey } from '@/utils/task-dates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { decodeTaskContent, encodeTaskContent, listTaskTypes, updateTask } from '@/sevices/farming-log.service';
import { getTaskTypeLabel } from '@/constants/task-types';
import { DEFAULT_WORK_START_TIME, DEFAULT_WORK_END_TIME } from '@/constants/work-hours';
import { Button, Calendar, Card, Input, Screen, s } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';
import { useDiscardWarning } from '@/hooks/use-discard-warning';

type EditValues = { title: string; instructions: string; startDate: string; due: string; tools: string };

export default function EditAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { leaderTasks, loadTasks } = useWorkSchedule();
  const task = leaderTasks.find(item => item.id === id);
  const [title, setTitle] = useState('');
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [due, setDue] = useState('');
  const [tools, setTools] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [initialValues, setInitialValues] = useState<EditValues | null>(null);
  const initializedTask = useRef<string | null>(null);
  const allowLeave = useRef(false);

  useEffect(() => {
    if (!task || initializedTask.current === task.id) return;
    initializedTask.current = task.id;
    allowLeave.current = false;
    setInitialValues({ title: task.title, instructions: task.instructions, startDate: task.startDate ?? '', due: task.due, tools: task.tools ?? '' });
    setTitle(task.title); setInstructions(task.instructions); setDue(task.due); setStartDate(task.startDate ?? '');
    setTools(task.tools ?? '');
  }, [task]);

  const dirty = !!initialValues && (
    title !== initialValues.title || instructions !== initialValues.instructions
    || startDate !== initialValues.startDate || due !== initialValues.due || tools !== initialValues.tools
  );
  const discardEdits = useCallback(() => {
    if (!initialValues) return;
    setTitle(initialValues.title);
    setInstructions(initialValues.instructions);
    setStartDate(initialValues.startDate);
    setDue(initialValues.due);
    setTools(initialValues.tools);
    setTaskPickerOpen(false);
    setCustomTitle(false);
    setError('');
  }, [initialValues]);
  const requestLeave = useDiscardWarning({
    dirty,
    onDiscard: discardEdits,
    bypassRef: allowLeave,
    title: 'Thoát khi chưa lưu thay đổi?',
    message: 'Bạn có thay đổi chưa lưu. Nếu thoát, các chỉnh sửa sẽ bị bỏ và dữ liệu công việc ban đầu vẫn được giữ nguyên.',
    discardLabel: 'Thoát và bỏ thay đổi',
  });

  useEffect(() => {
    let active = true;
    if (!accessToken) return;
    void listTaskTypes(accessToken)
      .then(types => { if (active) setTaskTypes(types); })
      .catch(() => { if (active) setCatalogError('Không tải được danh sách công việc. Bạn vẫn có thể tự nhập tên nhiệm vụ.'); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const useCustomTitle = customTitle || (!catalogLoading && !taskTypes.includes(title) && !!title) || (!catalogLoading && !taskTypes.length);

  async function save() {
    if (!accessToken || !task || busy) return;
    if (!title.trim() || !isValidDateKey(startDate) || !isValidDateKey(due)) { setError('Tên, ngày bắt đầu hoặc hạn hoàn thành chưa hợp lệ.'); return; }
    if (due < startDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    setBusy(true); setError('');
    try {
      const startTime = task.startTime || DEFAULT_WORK_START_TIME;
      const endTime = task.endTime || DEFAULT_WORK_END_TIME;
      await Promise.all(task.taskIds.map(taskId => updateTask(accessToken, taskId, {
        content: encodeTaskContent({ ...decodeTaskContent(task.rawContent), title: title.trim(), instructions: instructions.trim(), tools: tools.trim() || undefined, assignmentId: task.assignmentId, startTime, endTime }),
        start_at: `${startDate}T${startTime}:00+07:00`,
        due_at: `${due}T${endTime}:00+07:00`,
      })));
      await loadTasks();
      allowLeave.current = true;
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được công việc.'); }
    finally { setBusy(false); }
  }

  if (!task) return <Screen title="Chỉnh sửa công việc" back onBack={() => requestLeave()}><Text style={s.empty}>Không tìm thấy công việc trong tổ của bạn.</Text></Screen>;
  return <Screen title="Chỉnh sửa công việc" back onBack={() => requestLeave()}>
    <Feedback text={error} />
    <Card>
      <Text style={s.muted}>Người thực hiện: {task.workerName ?? 'Công nhân'} · Khu vực: {task.area}</Text>
      <Feedback text={catalogError} />
      <View style={{ gap: 8 }}>
        {useCustomTitle ? <>
          <Input label="Tên nhiệm vụ *" value={getTaskTypeLabel(title)} onChangeText={setTitle} maxLength={150} editable={!busy} autoFocus={customTitle} />
          {!!taskTypes.length && <Pressable disabled={busy} onPress={() => {
            Keyboard.dismiss(); setCustomTitle(false); setTaskPickerOpen(true); setTitle('');
          }}><Text style={s.link}>Chọn lại từ danh sách công việc</Text></Pressable>}
        </> : <>
          <Text style={s.label}>Tên nhiệm vụ *</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: taskPickerOpen, disabled: busy || catalogLoading }}
            disabled={busy || catalogLoading} onPress={() => { Keyboard.dismiss(); setTaskPickerOpen(open => !open); }}
            style={[s.input, { justifyContent: 'center' }]}>
            <Text style={title ? s.body : s.muted}>{getTaskTypeLabel(title) || (catalogLoading ? 'Đang tải danh sách công việc…' : 'Chọn tên nhiệm vụ')}</Text>
          </Pressable>
          {taskPickerOpen && <View style={{ borderWidth: 1, borderColor: '#DCE7DD', backgroundColor: '#FFFFFF' }}>
            {taskTypes.map(type => <Pressable key={type} disabled={busy}
              onPress={() => { setTitle(type); setTaskPickerOpen(false); }}
              style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
              <Text style={s.body}>{getTaskTypeLabel(type)}</Text>
            </Pressable>)}
            <Pressable disabled={busy} onPress={() => { setTitle(''); setTaskPickerOpen(false); setCustomTitle(true); }}
              style={{ paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#DCE7DD' }}>
              <Text style={s.link}>Khác — tự nhập tên nhiệm vụ</Text>
            </Pressable>
          </View>}
        </>}
      </View>
      <Input label="Hướng dẫn" value={instructions} onChangeText={setInstructions} multiline maxLength={3000} />
      <Input label="Công cụ / vật tư (không bắt buộc)" value={tools} onChangeText={setTools} maxLength={300} />
      <Calendar label="Ngày bắt đầu *" value={startDate} onChange={setStartDate} />
      <Calendar value={due} onChange={setDue} minimumDate={startDate || undefined} />
      <Button title={busy ? 'Đang lưu…' : 'Lưu thay đổi'} disabled={busy} onPress={save} />
    </Card>
  </Screen>;
}
