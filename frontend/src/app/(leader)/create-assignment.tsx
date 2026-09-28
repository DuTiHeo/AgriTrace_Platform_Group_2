import { router, useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { useLeader } from '@/contexts/leader-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useAuth } from '@/contexts/auth-context';
import { AreaPicker } from '@/components/leader/area-picker';
import { Feedback } from '@/components/leader/feedback';
import { Button, Calendar, Card, Input, Screen, s } from '@/components/leader/ui';
import { listPlots, type Plot } from '@/sevices/farming-log.service';

export default function CreateAssignmentScreen() {
  const navigation = useNavigation();
  const { members, addTask } = useLeader();
  const { accessToken } = useAuth();
  const { ready, error: storageError, retry } = useWorkSchedule();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [due, setDue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tools, setTools] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const fields = useRef<Record<string, View | null>>({});
  const allowLeave = useRef(false);

  const dirty = useMemo(() => !!(
    title.trim() || instructions.trim() || selected.length || area || due || startTime || endTime || tools.trim()
  ), [area, due, endTime, instructions, selected.length, startTime, title, tools]);

  useEffect(() => {
    if (!accessToken) return;
    void listPlots(accessToken)
      .then(setPlots)
      .catch(error => setMessage(error instanceof Error ? error.message : 'Không tải được danh sách lô đất.'));
  }, [accessToken]);

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (!dirty || allowLeave.current) return;
    event.preventDefault();
    Alert.alert(
      'Chưa hoàn thành giao việc',
      'Bạn chưa giao việc xong. Bạn có muốn thoát và bỏ nội dung đã nhập không?',
      [
        { text: 'Ở lại', style: 'cancel' },
        { text: 'Thoát', style: 'destructive', onPress: () => {
          allowLeave.current = true;
          navigation.dispatch(event.data.action);
        } },
      ],
    );
  }), [dirty, navigation]);

  const clearFieldError = (name: string) => setFieldErrors(old => old[name] ? { ...old, [name]: '' } : old);
  const fieldProps = (name: string) => ({
    ref: (node: View | null) => { fields.current[name] = node; },
    collapsable: false,
    style: { gap: 8, borderWidth: fieldErrors[name] ? 1 : 0, borderColor: '#B42318', borderRadius: 12, padding: fieldErrors[name] ? 8 : 0 },
  });
  const fieldError = (name: string) => fieldErrors[name] ? <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors[name]}</Text> : null;

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

  async function submit() {
    if (saving || !ready) return;
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Nhập tên nhiệm vụ.';
    if (!selected.length || selected.some(id => !members.some(member => member.id === id && member.active))) errors.members = 'Chọn ít nhất một công nhân đang hoạt động.';
    const plot = plots.find(item => item.code === area);
    if (!plot) errors.area = 'Chọn lô đất đang hoạt động.';
    const date = new Date(due + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(due.slice(0, 4)) || date.getMonth() + 1 !== Number(due.slice(5, 7)) || date.getDate() !== Number(due.slice(8, 10)) || date < today) errors.due = 'Chọn hạn hoàn thành hợp lệ, từ hôm nay trở đi.';
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime)) errors.startTime = 'Nhập giờ bắt đầu theo HH:mm (ví dụ 08:00).';
    if (!timePattern.test(endTime) || (timePattern.test(startTime) && endTime <= startTime)) errors.endTime = 'Nhập giờ kết thúc hợp lệ, sau giờ bắt đầu.';
    if (!tools.trim()) errors.tools = 'Nhập công cụ/vật tư; nếu không cần, ghi Không cần.';
    if (showErrors(errors)) return;

    setSaving(true); setMessage('');
    try {
      await addTask({
        title: title.trim(), instructions, memberIds: selected, area, plotId: plot!.plot_id,
        due, startTime, endTime, tools: tools.trim(),
      });
      allowLeave.current = true;
      router.replace('/(leader)/assignments');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu phân công.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Giao việc mới" back scrollRef={scrollRef}>
      <Feedback text={message || storageError} />
      {!!storageError && <Button title="Tải lại" onPress={retry} />}
      <Card>
        <Text style={s.muted}>Các mục có dấu * là bắt buộc. Ghi chú/hướng dẫn có thể để trống.</Text>

        <View {...fieldProps('title')}>
          <Input label="Tên nhiệm vụ *" value={title} onChangeText={value => { setTitle(value); if (value.trim()) clearFieldError('title'); }} placeholder="Ví dụ: Chăm sóc cây sầu riêng" maxLength={150} />
          {fieldError('title')}
        </View>

        <View {...fieldProps('members')}>
          <Text style={s.label}>Người thực hiện * · có thể chọn nhiều người</Text>
          {members.map(member => (
            <Pressable
              key={member.id}
              disabled={!member.active}
              onPress={() => {
                clearFieldError('members');
                setSelected(old => old.includes(member.id) ? old.filter(id => id !== member.id) : [...old, member.id]);
              }}
              style={[s.row, { opacity: member.active ? 1 : 0.45, paddingVertical: 6 }]}
            >
              <Text style={{ fontSize: 22, color: '#2E833D' }}>{selected.includes(member.id) ? '☑' : '☐'}</Text>
              <Text style={{ color: '#3E5845' }}>{member.name}{!member.active ? ' · Đã khóa' : ''}</Text>
            </Pressable>
          ))}
          {fieldError('members')}
        </View>

        <View {...fieldProps('area')}>
          <AreaPicker value={area} onChange={value => { setArea(value); clearFieldError('area'); }} options={plots.map(plot => plot.code)} />
          {fieldError('area')}
        </View>
        <View {...fieldProps('due')}>
          <Calendar value={due} onChange={value => { setDue(value); clearFieldError('due'); }} />
          {fieldError('due')}
        </View>
        <View {...fieldProps('startTime')}><Input label="Giờ bắt đầu *" value={startTime} onChangeText={value => { setStartTime(value); if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) clearFieldError('startTime'); }} placeholder="08:00" maxLength={5} />{fieldError('startTime')}</View>
        <View {...fieldProps('endTime')}><Input label="Giờ kết thúc *" value={endTime} onChangeText={value => { setEndTime(value); if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value) && value > startTime) clearFieldError('endTime'); }} placeholder="10:00" maxLength={5} />{fieldError('endTime')}</View>
        <View {...fieldProps('tools')}><Input label="Công cụ / vật tư *" value={tools} onChangeText={value => { setTools(value); if (value.trim()) clearFieldError('tools'); }} placeholder="Ví dụ: Kéo cắt tỉa, bình xịt" maxLength={300} />{fieldError('tools')}</View>
        <Input label="Ghi chú / hướng dẫn" value={instructions} onChangeText={setInstructions} placeholder="Ghi chú chi tiết cho công nhân…" multiline maxLength={3000} />

        <Button title={saving ? 'Đang giao việc…' : 'Giao việc ngay'} disabled={saving || !ready} onPress={submit} />
      </Card>
    </Screen>
  );
}
