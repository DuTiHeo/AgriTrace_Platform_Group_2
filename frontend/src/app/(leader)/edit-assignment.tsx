import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { encodeTaskContent, updateTask } from '@/sevices/farming-log.service';
import { Button, Calendar, Card, Input, Screen, s } from '@/components/leader/ui';
import { Feedback } from '@/components/leader/feedback';

export default function EditAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { leaderTasks, loadTasks } = useWorkSchedule();
  const task = leaderTasks.find(item => item.id === id);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [due, setDue] = useState('');
  const [tools, setTools] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title); setInstructions(task.instructions); setDue(task.due); setStartDate(task.startDate ?? '');
    setTools(task.tools ?? '');
  }, [task]);

  async function save() {
    if (!accessToken || !task || busy) return;
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4))
        && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
    };
    if (!title.trim() || !validDate(startDate) || !validDate(due)) { setError('Tên, ngày bắt đầu hoặc hạn hoàn thành chưa hợp lệ.'); return; }
    if (due < startDate) { setError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'); return; }
    setBusy(true); setError('');
    try {
      await Promise.all(task.taskIds.map(taskId => updateTask(accessToken, taskId, {
        content: encodeTaskContent({ title: title.trim(), instructions: instructions.trim(), tools: tools.trim() || undefined, assignmentId: task.assignmentId }),
        start_at: `${startDate}T00:00:00+07:00`,
        due_at: `${due}T23:59:59+07:00`,
      })));
      await loadTasks();
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được công việc.'); }
    finally { setBusy(false); }
  }

  if (!task) return <Screen title="Chỉnh sửa công việc" back><Text style={s.empty}>Không tìm thấy công việc trong tổ của bạn.</Text></Screen>;
  return <Screen title="Chỉnh sửa công việc" back>
    <Feedback text={error} />
    <Card>
      <Text style={s.muted}>Người thực hiện: {task.workerName ?? 'Công nhân'} · Khu vực: {task.area}</Text>
      <Input label="Tên nhiệm vụ *" value={title} onChangeText={setTitle} maxLength={150} />
      <Input label="Hướng dẫn" value={instructions} onChangeText={setInstructions} multiline maxLength={3000} />
      <Calendar label="Ngày bắt đầu *" value={startDate} onChange={setStartDate} />
      <Calendar value={due} onChange={setDue} minimumDate={startDate || undefined} />
      <Input label="Công cụ / vật tư (không bắt buộc)" value={tools} onChangeText={setTools} maxLength={300} />
      <Button title={busy ? 'Đang lưu…' : 'Lưu thay đổi'} disabled={busy} onPress={save} />
    </Card>
  </Screen>;
}
