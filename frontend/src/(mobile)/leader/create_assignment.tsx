import { PartialAssignmentError } from '@/sevices/task_batch';
import type { ComponentRef } from 'react';
import { isValidDateKey, localDateKey } from '@/utils/task_dates';
import { getTaskTypeLabel } from '@/constants/task_types';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLeader } from '@/contexts/leader_context';
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { useAuth } from '@/contexts/auth_context';
import { Feedback } from '@/components/leader/feedback';
import { Button, Calendar, Card, Input, Screen, s } from '@/components/leader/ui';
import { listPlots, listSeasons, listTaskTypes, type Season } from '@/sevices/farming_log.service';
import { useDiscardWarning } from '@/hooks/use_discard_warning';

export default function CreateAssignmentScreen() {
  const { members, addTask } = useLeader();
  const { accessToken, user } = useAuth();
  const { ready, error: storageError, retry } = useWorkSchedule();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [due, setDue] = useState('');
  const [tools, setTools] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const submitAreaRef = useRef<ComponentRef<typeof View>>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const focusedInput = useRef<'tools' | 'instructions' | null>(null);
  const fields = useRef<Record<string, ComponentRef<typeof View> | null>>({});
  const allowLeave = useRef(false);
  useFocusEffect(useCallback(() => {
    allowLeave.current = false;
  }, []));
  const activeMemberIds = useMemo(() => members.filter(member => member.active).map(member => member.id), [members]);
  const selectedActiveCount = activeMemberIds.filter(id => selected.includes(id)).length;
  const allActiveSelected = activeMemberIds.length > 0 && selectedActiveCount === activeMemberIds.length;

  const hasMultiplePlots = new Set(seasons.map(season => season.plot_id)).size > 1;
  const season = hasMultiplePlots ? seasons.find(item => item.season_id === seasonId) : seasons[0];

  const dirty = useMemo(() => !!(
    title.trim() || instructions.trim() || selected.length || seasonId || startDate || due || tools.trim()
  ), [seasonId, due, instructions, selected.length, startDate, title, tools]);

  const clearAssignmentForm = useCallback(() => {
    setTitle('');
    setTaskPickerOpen(false);
    setCustomTitle(false);
    setInstructions('');
    setSelected([]);
    setSeasonId('');
    setStartDate('');
    setDue('');
    setTools('');
    setMessage('');
    setFieldErrors({});
    focusedInput.current = null;
    keyboardTop.current = null;
    scrollY.current = 0;
  }, []);

  useFocusEffect(useCallback(() => {
    if (!accessToken) return;
    let active = true;
    setLoadingSeasons(true);
    const teamId = user?.team_id;
    void Promise.all([
      teamId ? listSeasons(accessToken, teamId) : Promise.resolve([]),
      teamId ? listPlots(accessToken) : Promise.resolve([]),
    ]).then(([assignedSeasons, plots]) => {
      if (!active) return;
      const activePlotIds = new Set(plots.map(plot => plot.plot_id));
      setSeasons(assignedSeasons.filter(item =>
        activePlotIds.has(item.plot_id) && ['growing', 'ready_to_harvest'].includes(item.status)
      ));
    }).catch(error => {
      if (!active) return;
      setSeasons([]);
      setMessage(error instanceof Error ? error.message : 'Không tải được mùa vụ của tổ.');
    }).finally(() => {
      if (active) setLoadingSeasons(false);
    });

    void listTaskTypes(accessToken)
      .then(types => { if (active) setTaskTypes(types); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Không tải được loại công việc.'); });
    return () => { active = false; };
  }, [accessToken, user]));

  const requestLeave = useDiscardWarning({
    dirty,
    onDiscard: clearAssignmentForm,
    bypassRef: allowLeave,
    title: 'Chưa hoàn thành giao việc',
    message: 'Bạn chưa giao việc xong. Bạn có xác nhận thoát không? Toàn bộ nội dung đã nhập sẽ bị xóa.',
  });

  const alignSubmitButtonWithKeyboard = useCallback(() => {
    const submitArea = submitAreaRef.current;
    const top = keyboardTop.current;
    if (!submitArea || top == null || !focusedInput.current) return;
    submitArea.measureInWindow((_x, y, _width, height) => {
      const coveredPixels = y + height - top;
      if (coveredPixels > 2) {
        scrollRef.current?.scrollTo({ y: scrollY.current + coveredPixels, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTop.current = event.endCoordinates.screenY;
      if (focusedInput.current) setTimeout(alignSubmitButtonWithKeyboard, 160);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null; });
    return () => { shown.remove(); hidden.remove(); };
  }, [alignSubmitButtonWithKeyboard]);

  function trackScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }

  function focusInput(name: 'tools' | 'instructions') {
    focusedInput.current = name;
    if (keyboardTop.current != null) setTimeout(alignSubmitButtonWithKeyboard, 80);
  }

  function blurInput(name: 'tools' | 'instructions') {
    if (focusedInput.current === name) focusedInput.current = null;
  }

  const clearFieldError = (name: string) => setFieldErrors(old => old[name] ? { ...old, [name]: '' } : old);
  const fieldProps = (name: string) => ({
    collapsable: false,
    style: { gap: 8, borderWidth: fieldErrors[name] ? 1 : 0, borderColor: '#B42318', borderRadius: 0, padding: fieldErrors[name] ? 8 : 0 },
  });
  const fieldError = (name: string) => fieldErrors[name] ? <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors[name]}</Text> : null;
  function showErrors(errors: Record<string, string>) {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      Keyboard.dismiss();
      requestAnimationFrame(() => {
        const scroll = scrollRef.current;
        const inner = scroll?.getInnerViewNode();
        if (scroll && inner != null) fields.current[first]?.measureLayout(inner, (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 20), animated: true }));
      });
    }
    return !!first;
  }

  async function submit() {
    if (saving || !ready || loadingSeasons) return;
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Nhập tên nhiệm vụ.';
    if (!selected.length || selected.some(id => !members.some(member => member.id === id && member.active))) errors.members = 'Chọn ít nhất một công nhân đang hoạt động.';
    if (hasMultiplePlots && !season) errors.season = 'Chọn mùa vụ để xác định khu vực giao việc.';
    if (!isValidDateKey(startDate) || startDate < localDateKey(new Date())) errors.startDate = 'Chọn ngày bắt đầu từ hôm nay trở đi.';
    if (!isValidDateKey(due) || !isValidDateKey(startDate) || due < startDate) errors.due = 'Chọn ngày kết thúc bằng hoặc sau ngày bắt đầu.';
    if (showErrors(errors) || !season) return;

    setSaving(true); setMessage('');
    try {
      await addTask({
        title: title.trim(), instructions, memberIds: selected, area: season.plot_code, plotId: season.plot_id,
        startDate, due, tools: tools.trim() || undefined,
      });
      allowLeave.current = true;
      clearAssignmentForm();
      router.replace({ pathname: '/leader/assignments', params: { taskId: '' } });
    } catch (error) {
      if (error instanceof PartialAssignmentError) setSelected(old => old.filter(id => !error.succeededWorkerIds.includes(id)));
      setMessage(error instanceof Error ? error.message : 'Không thể lưu phân công.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Giao việc mới" back onBack={() => requestLeave()} scrollRef={scrollRef} onScroll={trackScroll}>
      <Feedback text={message || storageError} />
      {!!storageError && <Button title="Tải lại" onPress={retry} />}
      <Card>
        <View ref={node => { fields.current.title = node; }} {...fieldProps('title')}>
          {customTitle || !taskTypes.length ? (
            <>
              <Input label="Tên nhiệm vụ *" value={getTaskTypeLabel(title)} onChangeText={value => { setTitle(value); if (value.trim()) clearFieldError('title'); }} placeholder="Nhập tên nhiệm vụ khác" maxLength={150} autoFocus={customTitle} />
              {!!taskTypes.length && (
                <Pressable onPress={() => { Keyboard.dismiss(); setCustomTitle(false); setTaskPickerOpen(true); setTitle(''); }}>
                  <Text style={s.link}>Chọn lại từ danh sách công việc</Text>
                </Pressable>
              )}
            </>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Tên nhiệm vụ *</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: taskPickerOpen }}
                onPress={() => { Keyboard.dismiss(); setTaskPickerOpen(open => !open); }}
                style={[s.input, { justifyContent: 'center' }]}
              >
                <Text style={{ color: title ? '#243C2A' : '#9AA99E' }}>{getTaskTypeLabel(title) || 'Chọn tên nhiệm vụ'}</Text>
              </Pressable>
              {taskPickerOpen && (
                <View style={{ borderWidth: 1, borderColor: '#DCE7DD', borderRadius: 0, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                  {taskTypes.map((taskType, index) => (
                    <Pressable
                      key={taskType}
                      onPress={() => { setTitle(taskType); setTaskPickerOpen(false); clearFieldError('title'); }}
                      style={{ paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: index === taskTypes.length - 1 ? 0 : 1, borderBottomColor: '#EDF2ED' }}
                    >
                      <Text style={{ color: '#35583C' }}>{getTaskTypeLabel(taskType)}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => { setTitle(''); setTaskPickerOpen(false); setCustomTitle(true); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#DCE7DD', backgroundColor: '#F6F8F6' }}
                  >
                    <Text style={[s.link, { fontWeight: '700' }]}>Khác — tự nhập tên nhiệm vụ</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          {fieldError('title')}
        </View>

        <View ref={node => { fields.current.members = node; }} {...fieldProps('members')}>
          <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={[s.label, { flex: 1 }]}>Người thực hiện *</Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Chọn tất cả ${activeMemberIds.length} người đang hoạt động`}
              accessibilityState={{
                checked: allActiveSelected ? true : selectedActiveCount > 0 ? 'mixed' : false,
                disabled: activeMemberIds.length === 0,
              }}
              disabled={activeMemberIds.length === 0}
              onPress={() => {
                clearFieldError('members');
                setSelected(allActiveSelected ? [] : activeMemberIds);
              }}
              style={[
                s.row,
                { minHeight: 36, paddingHorizontal: 4, opacity: activeMemberIds.length ? 1 : 0.45 },
              ]}
            >
              <Text style={{ fontSize: 20, color: '#2E833D' }}>{allActiveSelected ? '☑' : selectedActiveCount > 0 ? '▣' : '☐'}</Text>
              <Text style={{ color: '#2E833D', fontWeight: '700' }}>Chọn tất cả</Text>
            </Pressable>
          </View>
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

        {loadingSeasons ? (
          <Text style={s.muted}>Đang tải mùa vụ của tổ…</Text>
        ) : hasMultiplePlots ? (
          <View ref={node => { fields.current.season = node; }} {...fieldProps('season')}>
            <Text style={s.label}>Mùa vụ</Text>
            {seasons.map(item => (
              <Button
                key={item.season_id}
                secondary={seasonId !== item.season_id}
                title={`${item.crop_name} · ${item.plot_code} · ${item.planting_date}`}
                onPress={() => {
                  setSeasonId(item.season_id);
                  clearFieldError('season');
                }}
              />
            ))}
            {fieldError('season')}
          </View>
        ) : !season && (
          <Text style={s.muted}>Tổ chưa được gán vào mùa vụ đang hoạt động có lô đất hợp lệ.</Text>
        )}
        <View style={{ gap: 8 }}>
          <Text style={[s.label, { fontWeight: '700' }]}>Thời gian thực hiện *</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View ref={node => { fields.current.startDate = node; }} {...fieldProps('startDate')} style={[fieldProps('startDate').style, { flex: 1 }]}>
              <Calendar
                label="Ngày bắt đầu"
                value={startDate}
                minimumDate={localDateKey(new Date())}
                onChange={value => {
                  setStartDate(value);
                  clearFieldError('startDate');
                  if (due && due < value) setDue('');
                }}
              />
              {fieldError('startDate')}
            </View>
            <View ref={node => { fields.current.due = node; }} {...fieldProps('due')} style={[fieldProps('due').style, { flex: 1 }]}>
              <Calendar
                label="Ngày kết thúc"
                value={due}
                minimumDate={startDate || localDateKey(new Date())}
                onChange={value => { setDue(value); clearFieldError('due'); }}
              />
              {fieldError('due')}
            </View>
          </View>
          <Text style={s.muted}>Ngày kết thúc không được trước ngày bắt đầu.</Text>
        </View>
        <View ref={node => { fields.current.tools = node; }} {...fieldProps('tools')}><Input label="Công cụ / vật tư (không bắt buộc)" value={tools} onFocus={() => focusInput('tools')} onBlur={() => blurInput('tools')} onChangeText={setTools} placeholder="Ví dụ: Kéo cắt tỉa, bình xịt" maxLength={300} /></View>
        <View ref={node => { fields.current.instructions = node; }}><Input label="Ghi chú / hướng dẫn" value={instructions} onFocus={() => {
          focusInput('instructions');
        }} onBlur={() => blurInput('instructions')} onChangeText={setInstructions} placeholder="Ghi chú chi tiết cho công nhân…" multiline maxLength={3000} /></View>

        <View ref={submitAreaRef} collapsable={false}>
          <Button title={saving ? 'Đang giao việc…' : 'Giao việc ngay'} disabled={saving || !ready || loadingSeasons || !seasons.length} onPress={submit} />
        </View>
      </Card>
    </Screen>
  );
}
