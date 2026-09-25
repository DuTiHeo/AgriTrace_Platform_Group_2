import { useFinishTabFlow } from '@/hooks/use-finish-tab-flow';
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLeader } from "@/contexts/leader-context";
import { Button, Card, Chip, Input, Screen, Section, s } from "@/components/leader/ui";
import { Feedback } from "@/components/leader/feedback";
import { AreaPicker } from "@/components/leader/area-picker";
import { Photos } from "@/components/leader/report-photos";
import { useFarmingLogForm } from '@/hooks/use-farming-log-form';
import type { ReportDraft } from '@/contexts/report-context';

export default function CaptureScreen() {
  const finishTabFlow = useFinishTabFlow();
  const { draft, setDraft } = useLeader();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Record<string, number>>({});
  const pending = useRef(false);
  const reportDraft: ReportDraft = { taskTitle: draft.title, taskId: draft.taskId, area: draft.area, note: draft.note, photos: draft.photos, seasonId: draft.seasonId, gps: draft.gps, savedLogId: draft.savedLogId };
  const updateReportDraft = useCallback((update: (old: ReportDraft) => ReportDraft) => {
    setDraft(old => {
      const next = update({ taskTitle: old.title, taskId: old.taskId, area: old.area, note: old.note, photos: old.photos, seasonId: old.seasonId, gps: old.gps, savedLogId: old.savedLogId });
      return { title: next.taskTitle, taskId: next.taskId, area: next.area, note: next.note, photos: next.photos, seasonId: next.seasonId, gps: next.gps, savedLogId: next.savedLogId };
    });
  }, [setDraft]);
  const { gpsStatus, preparePhoto, submit } = useFarmingLogForm(reportDraft, updateReportDraft);

  async function capture() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { setError('Vui lòng cho phép truy cập camera trong cài đặt điện thoại.'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        const uri = await preparePhoto(result.assets[0].uri);
        setDraft(old => ({ ...old, photos: [...old.photos, uri].slice(0, 5) }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được camera. Vui lòng kiểm tra quyền hoặc dùng thiết bị có camera.'); }
    finally { setBusy(false); pending.current = false; }
  }

  async function postDraft() {
    if (pending.current) return;
    const errors: Record<string, string> = {};
    if (!draft.title.trim()) errors.title = 'Vui lòng nhập tên công việc.';
    if (!draft.area.trim()) errors.area = 'Vui lòng chọn khu vực thực hiện.';
    if (!draft.note.trim()) errors.note = 'Vui lòng nhập nội dung nhật ký.';
    if (draft.photos.length < 2) errors.photos = 'Cần ít nhất 2 ảnh minh chứng.';
    if (!draft.seasonId) errors.season = 'Chưa có mùa vụ đang canh tác.';
    if (!draft.gps) errors.gps = 'Chưa lấy được vị trí GPS.';
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, (fieldY.current[first] ?? 0) - 20), animated: true }));
      return;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      await submit();
      setDraft({ title: '', area: '', note: '', photos: [] });
      finishTabFlow('diary');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không đăng được nhật ký.'); }
    finally { setBusy(false); pending.current = false; }
  }

  return (
    <Screen title="Chụp ảnh & ghi nhật ký" back scrollRef={scrollRef}>
      <Card>
        <Chip text="BẢN NHÁP · CHƯA GỬI" />
        <Text style={s.muted}>Ảnh và ghi chú được giữ khi chuyển màn hình trong phiên hiện tại. Cần ít nhất 2 ảnh để đăng nhật ký.</Text>
        <View
          onLayout={event => { fieldY.current.gps = event.nativeEvent.layout.y; }}
          accessibilityLiveRegion="polite"
          style={{
            borderWidth: 1,
            borderColor: draft.gps ? '#75A96D' : '#E9C46A',
            backgroundColor: draft.gps ? '#EAF6E8' : '#FFF8E7',
            borderRadius: 12,
            padding: 12,
            gap: 4
          }}
        >
          <Text style={s.label}>📍 Vị trí GPS</Text>
          <Text style={[s.muted, { fontSize: 12, color: draft.gps ? '#2F6F37' : '#617A68' }]}>{gpsStatus}</Text>
        </View>
        {!!fieldErrors.gps && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.gps}</Text>}
        {!!fieldErrors.season && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.season}</Text>}
        <View onLayout={event => { fieldY.current.title = event.nativeEvent.layout.y; }}>
          <Input label="Tên công việc *" placeholder="Bạn vừa thực hiện công việc gì?" value={draft.title} maxLength={50} onChangeText={title => { setDraft(old => ({ ...old, title })); if (title.trim()) setFieldErrors(old => ({ ...old, title: '' })); }} />
          {!!fieldErrors.title && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.title}</Text>}
        </View>
        <View onLayout={event => { fieldY.current.area = event.nativeEvent.layout.y; }}>
          <AreaPicker value={draft.area} onChange={area => { setDraft(old => ({ ...old, area })); setFieldErrors(old => ({ ...old, area: '' })); }} />
          {!!fieldErrors.area && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.area}</Text>}
        </View>
        <View onLayout={event => { fieldY.current.note = event.nativeEvent.layout.y; }}>
          <Input label="Nội dung nhật ký *" accessibilityHint="Có thể nhập bằng bàn phím hoặc dùng nút micro trên bàn phím điện thoại" placeholder="Mô tả kết quả và những điều cần lưu ý…" multiline value={draft.note} onChangeText={note => { setDraft(old => ({ ...old, note })); if (note.trim()) setFieldErrors(old => ({ ...old, note: '' })); }} />
          {!!fieldErrors.note && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.note}</Text>}
          <Text style={s.link}>🎙 Có thể dùng nút micro trên bàn phím để nhập giọng nói</Text>
        </View>
      </Card>
      <View onLayout={event => { fieldY.current.photos = event.nativeEvent.layout.y; }}><Card>
        <Section title={`Ảnh minh chứng · ${draft.photos.length}/5`} />
        <Photos photos={draft.photos} />
        {draft.photos.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {draft.photos.map((_, i) => <Button key={i} secondary title={`Xóa ảnh ${i + 1}`} onPress={() => setDraft(old => ({ ...old, photos: old.photos.filter((__, j) => j !== i) }))} />)}
        </View>}
        <Button secondary title={busy ? 'Đang xử lý…' : '📷  Chụp ảnh'} disabled={busy || draft.photos.length >= 5} onPress={capture} />
        <Text style={s.muted}>{draft.photos.length < 2 ? `Chụp thêm ${2 - draft.photos.length} ảnh để có thể đăng.` : 'Đã đủ ảnh. Bạn có thể chụp thêm hoặc đăng nhật ký.'}</Text>
        {!!fieldErrors.photos && <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{fieldErrors.photos}</Text>}
        <Feedback text={error} />
      </Card></View>
      <Button title="Đăng nhật ký" disabled={busy} onPress={() => { void postDraft(); }} />
    </Screen>
  );
}
