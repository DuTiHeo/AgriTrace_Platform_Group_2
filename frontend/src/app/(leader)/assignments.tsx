import { useLocalSearchParams, router } from 'expo-router';
import { PriorityBadge, PriorityPicker, type TaskPriority } from '@/components/common/task-priority';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { useLeader, areas } from "@/contexts/leader-context";
import {
  Avatar,
  Button,
  Calendar,
  Card,
  dateText,
  go,
  Input,
  Screen,
  Section,
  s,
  Status
} from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";
import { AreaPicker } from "@/components/leader/area-picker";

export default function AssignmentsScreen() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { members, tasks, addTask } = useLeader();
  const { ready, error: storageError, retry } = useWorkSchedule();
  const scrollRef = useRef<ScrollView>(null);
  const fields = useRef<Record<string, View | null>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function showErrors(errors: Record<string, string>) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      Keyboard.dismiss();
      requestAnimationFrame(() => {
        const scroll = scrollRef.current;
        if (scroll) fields.current[first]?.measureLayout(scroll.getInnerViewNode(), (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 20), animated: true }));
      });
    }
    return !!first;
  }
  const fieldProps = (name: string) => ({
    ref: (node: View | null) => { fields.current[name] = node; },
    collapsable: false,
    style: { gap: 8, borderWidth: fieldErrors[name] ? 1 : 0, borderColor: '#B42318', borderRadius: 12, padding: fieldErrors[name] ? 8 : 0 },
  });
  const fieldError = (name: string) => fieldErrors[name] ? <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors[name]}</Text> : null;
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tools, setTools] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(''),
    [instructions, setInstructions] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [area, setArea] = useState(areas[0]),
    [due, setDue] = useState(''),
    [message, setMessage] = useState('');

  const assigned = tasks.filter(t => !t.owner && (!taskId || t.id === taskId));

  async function submit() {
    if (saving || !ready) return;
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Nhập tên nhiệm vụ.';
    if (!selected.length || selected.some(id => !members.some(m => m.id === id && m.active))) errors.members = 'Chọn ít nhất một công nhân đang hoạt động.';
    if (!areas.includes(area)) errors.area = 'Chọn khu vực làm việc.';
    const date = new Date(due + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(due.slice(0, 4)) || date.getMonth() + 1 !== Number(due.slice(5, 7)) || date.getDate() !== Number(due.slice(8, 10)) || date < today) errors.due = 'Chọn hạn hoàn thành hợp lệ, từ hôm nay trở đi.';
    if (!['high', 'medium', 'low'].includes(priority)) errors.priority = 'Chọn mức độ ưu tiên.';
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime)) errors.startTime = 'Nhập giờ bắt đầu theo HH:mm (ví dụ 08:00).';
    if (!timePattern.test(endTime) || (timePattern.test(startTime) && endTime <= startTime)) errors.endTime = 'Nhập giờ kết thúc hợp lệ, sau giờ bắt đầu.';
    if (!tools.trim()) errors.tools = 'Nhập công cụ/vật tư; nếu không cần, ghi Không cần.';
    if (showErrors(errors)) return;
    setSaving(true);
    try {
    await addTask({
      title: title.trim(),
      instructions,
      memberIds: selected,
      area,
      due, priority, startTime, endTime, tools: tools.trim()
    });

    setOpen(false);
    setTitle('');
    setInstructions('');
    setSelected([]);
    setDue('');
    setPriority('medium'); setStartTime(''); setEndTime(''); setTools('');
    setFieldErrors({});
    setMessage('Đã lưu phân công.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể lưu phân công.'); }
    finally { setSaving(false); }
  }

  return (
    <Screen title="Quản lý giao việc" scrollRef={scrollRef}>
      {!!taskId && <Button secondary title="Xem tất cả phân công" onPress={() => router.setParams({ taskId: '' })} />}
      {!!taskId && !assigned.length && <Text style={s.muted}>Công việc này không còn trong danh sách.</Text>}
      <View style={s.row}>
        <Text style={[s.muted, { flex: 1 }]}>
          {assigned.length} nhiệm vụ · {members.length} thành viên
        </Text>

        <Button
          title={open ? 'Đóng biểu mẫu' : '+ Giao việc mới'}
          onPress={() => {
            setOpen(!open);
            setMessage('');
            setFieldErrors({});
          }}
        />
      </View>

      <Feedback text={message || storageError} />
      {!!storageError && <Button title="Tải lại lịch" onPress={retry} />}

      {open && (
        <Card>
          <Section title="Giao việc mới" />
          <Text style={s.muted}>Các mục có dấu * là bắt buộc. Chỉ ghi chú được để trống.</Text>

          <View {...fieldProps('title')}>
          <Input
            label="Tên nhiệm vụ *"
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Chăm sóc luống rau khu A"
            maxLength={150}
          />
          {fieldError('title')}</View>
          <View {...fieldProps('members')}>

          <Text style={s.label}>
            Người thực hiện * · chọn nhiều người
          </Text>

          {members.map(m => (
            <Pressable
              key={m.id}
              disabled={!m.active}
              onPress={() => {
                Keyboard.dismiss();
                setSelected(old =>
                  old.includes(m.id)
                    ? old.filter(id => id !== m.id)
                    : [...old, m.id]
                );
              }}
              style={[
                s.row,
                {
                  opacity: m.active ? 1 : 0.45,
                  paddingVertical: 6
                }
              ]}
            >
              <Text
                style={{
                  fontSize: 22,
                  color: '#2E833D'
                }}
              >
                {selected.includes(m.id) ? '☑' : '☐'}
              </Text>

              <Text style={{ color: '#3E5845' }}>
                {m.name}
                {!m.active ? ' · Đã khóa' : ''}
              </Text>
            </Pressable>
          ))}

          {fieldError('members')}</View>
          <View {...fieldProps('area')}>
          <Text style={s.label}>Khu vực *</Text>
          <AreaPicker
            value={area}
            onChange={setArea}
          />
          {fieldError('area')}</View>

          <View {...fieldProps('due')}>
          <Text style={s.label}>Hạn hoàn thành *</Text>
          <Calendar
            value={due}
            onChange={setDue}
          />
          {fieldError('due')}</View>

          <View {...fieldProps('priority')}><Text style={s.label}>Ưu tiên *</Text><PriorityPicker value={priority} onChange={setPriority} />{fieldError('priority')}</View>
          <View {...fieldProps('startTime')}><Input label="Giờ bắt đầu *" value={startTime} onChangeText={setStartTime} placeholder="08:00" maxLength={5} />{fieldError('startTime')}</View>
          <View {...fieldProps('endTime')}><Input label="Giờ kết thúc *" value={endTime} onChangeText={setEndTime} placeholder="10:00" maxLength={5} />{fieldError('endTime')}</View>
          <View {...fieldProps('tools')}><Input label="Công cụ / vật tư *" value={tools} onChangeText={setTools} placeholder="Ví dụ: Kéo cắt tỉa, bình xịt cầm tay" maxLength={300} />{fieldError('tools')}</View>
          <Input
            label="Ghi chú / hướng dẫn (không bắt buộc)"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Ghi chú chi tiết cho công nhân…"
            multiline
            maxLength={3000}
          />

          <Button
            title={saving ? "Đang lưu…" : "Giao việc ngay"}
            disabled={saving || !ready}
            onPress={submit}
          />

          <Button
            secondary
            title="Hủy"
            onPress={() => setOpen(false)}
          />
        </Card>
      )}

      <Section title="Công nhân được giao việc" />

      {members
        .filter(m =>
          assigned.some(t => t.memberIds.includes(m.id))
        )
        .map(m => (
          <Card key={m.id}>
            <Pressable
              style={s.row}
              onPress={() => go('member-detail', m.id)}
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

              <Text style={s.link}>
                Chi tiết ›
              </Text>
            </Pressable>

            {assigned
              .filter(t => t.memberIds.includes(m.id))
              .map(t => (
                <View
                  key={t.id}
                  style={{
                    borderTopWidth: 1,
                    borderColor: '#EFF3EF',
                    paddingTop: 13,
                    gap: 8
                  }}
                >
                  <View style={s.row}>
                    <Text
                      style={[
                        s.label,
                        { flex: 1 }
                      ]}
                    >
                      {t.title}
                    </Text>

                    <Status status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </View>

                  <Text style={s.muted}>
                    {t.area} · Hạn {dateText(t.due)}
                  </Text>

                  {t.instructions ? (
                    <Text
                      style={{
                        color: '#708575',
                        fontSize: 12,
                        lineHeight: 18
                      }}
                    >
                      {t.instructions}
                    </Text>
                  ) : null}

                  {t.memberIds.length > 1 && (
                    <Text style={s.link}>
                      Cùng làm:{' '}
                      {members
                        .filter(
                          x =>
                            t.memberIds.includes(x.id) &&
                            x.id !== m.id
                        )
                        .map(x => x.name)
                        .join(', ')}
                    </Text>
                  )}
                </View>
              ))}
          </Card>
        ))}
    </Screen>
  );
}
