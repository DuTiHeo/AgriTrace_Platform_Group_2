import { useFinishTabFlow } from '@/hooks/use-finish-tab-flow';
import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/common/primary-button';
import { FullScreenImageViewer } from '@/components/common/full-screen-image-viewer';
import { type ReportDraft, useReports } from '@/contexts/report-context';
import { useFarmingLogForm } from '@/hooks/use-farming-log-form';
import { useDiscardWarning } from '@/hooks/use-discard-warning';
import { useAuth } from '@/contexts/auth-context';
import { listPlots, listTaskTypes, type Plot } from '@/sevices/farming-log.service';
import { AreaPicker } from '@/components/leader/area-picker';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { VoiceInputButton } from '@/components/common/voice-input-button';

export function FarmingLogFormScreen() {
  const finishTabFlow = useFinishTabFlow();
  const { accessToken, user } = useAuth();
  const params = useLocalSearchParams<{ taskTitle?: string; area?: string; taskId?: string; plotId?: string }>();
  const taskTitle = typeof params.taskTitle === 'string' ? params.taskTitle : '';
  const area = typeof params.area === 'string' ? params.area : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  const plotId = typeof params.plotId === 'string' ? params.plotId : undefined;
  const draftKey = taskId ? `task:${taskId}` : JSON.stringify([taskTitle, area]);
  const { drafts, setDrafts } = useReports();
  const emptyDraft: ReportDraft = { taskTitle, area, taskId, plotId, note: '', photos: [] };
  const draft = drafts[draftKey] ?? emptyDraft;
  const updateDraft = useCallback((update: (old: ReportDraft) => ReportDraft) => {
    setDrafts(old => ({ ...old, [draftKey]: update(old[draftKey] ?? emptyDraft) }));
  }, [draftKey, setDrafts, taskTitle, area, taskId]);
  const { gpsStatus, locate, preparePhoto, submit, activeSeasons } = useFarmingLogForm(draft, updateDraft);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const voice = useVoiceInput(accessToken, draftKey, text => {
    updateDraft(old => ({ ...old, note: old.note.trimEnd() ? `${old.note.trimEnd()}\n${text}` : text }));
    setFieldErrors(old => ({ ...old, note: '' }));
  });
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const titleRef = useRef<TextInput>(null), noteRef = useRef<TextInput>(null);
  const fieldY = useRef<Record<string, number>>({});
  const pending = useRef(false);
  const submitted = useRef(false);
  const availablePlots = plots.filter(plot => activeSeasons.some(season => season.plot_id === plot.plot_id));
  const revealInput = useCallback((ref: RefObject<TextInput | null>) => {
    setTimeout(() => {
      const scroll = scrollRef.current;
      const input = ref.current;
      const content = contentRef.current;
      if (!scroll || !input || !content) return;
      input.measureLayout(
        content,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 70), animated: true }),
        () => undefined,
      );
    }, 280);
  }, []);
  useFocusEffect(useCallback(() => { submitted.current = false; setError(''); }, []));
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void Promise.all([listPlots(accessToken), listTaskTypes(accessToken)])
      .then(([plotList, typeList]) => {
        if (!active) return;
        setPlots(plotList);
        setTaskTypes(typeList);
        if (taskTitle && !typeList.includes(taskTitle)) setCustomTitle(true);
      })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được danh sách công việc và khu vực.'); })
      .finally(() => { if (active) setCatalogLoaded(true); });
    return () => { active = false; };
  }, [accessToken, taskTitle]);
  const hasUnsentContent = !!(
    draft.note.trim()
    || draft.photos.length
    || draft.savedLogId
    || draft.taskTitle !== taskTitle
    || draft.area !== area
  );

  const discardDraft = useCallback(() => {
    setDrafts(old => { const next = { ...old }; delete next[draftKey]; return next; });
    setSelectedPhoto(null);
    setTaskPickerOpen(false);
    setCustomTitle(false);
    setError('');
    setFieldErrors({});
  }, [draftKey, setDrafts]);
  const requestLeave = useDiscardWarning({ dirty: hasUnsentContent, onDiscard: discardDraft, bypassRef: submitted });
  const clearFieldError = (name: string) => setFieldErrors(old => old[name] ? { ...old, [name]: '' } : old);
  const fieldError = (name: string) => fieldErrors[name] ? <Text accessibilityRole="alert" style={styles.fieldError}>{fieldErrors[name]}</Text> : null;
  function validate() {
    const errors: Record<string, string> = {};
    if (!draft.taskTitle.trim()) errors.taskTitle = 'Vui lòng nhập tên công việc.';
    if (!draft.area.trim() || !draft.plotId) errors.area = 'Vui lòng chọn khu vực thực hiện.';
    if (!draft.note.trim()) errors.note = 'Vui lòng nhập nội dung nhật ký.';
    if (draft.photos.length < 2) errors.photos = 'Cần ít nhất 2 ảnh minh chứng.';
    if (!draft.seasonId) errors.season = 'Lô đất này chưa có mùa vụ đang canh tác. Vui lòng báo người quản lý thiết lập mùa vụ.';
    if (!draft.gps) errors.gps = 'Chưa lấy được vị trí GPS.';
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, (fieldY.current[first] ?? 0) - 20), animated: true });
      ({ taskTitle: titleRef, note: noteRef }[first])?.current?.focus();
    });
    return false;
  }

  async function capture() {
    Keyboard.dismiss();
    if (pending.current || voice.busy || draft.photos.length >= 5) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Vui lòng cho phép truy cập camera trong cài đặt điện thoại.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: false });
      if (!result.canceled && result.assets[0]) {
        const uri = await preparePhoto(result.assets[0].uri);
        updateDraft(old => ({ ...old, photos: [...old.photos, uri].slice(0, 5) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không mở được camera. Vui lòng kiểm tra quyền hoặc dùng thiết bị có camera.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function submitReport() {
    Keyboard.dismiss();
    if (pending.current || submitted.current || busy || voice.busy) return;
    if (!validate()) return;
    submitted.current = true;
    setBusy(true);
    setError('');
    try {
      await submit();
      setDrafts(old => { const next = { ...old }; delete next[draftKey]; return next; });
      finishTabFlow('diary');
    } catch (e) { submitted.current = false; setError(e instanceof Error ? e.message : 'Không lưu được báo cáo.'); }
    finally { setBusy(false); }
  }

  function goBack() {
    Keyboard.dismiss();
    requestLeave(user?.role === 'worker' && !taskId ? () => router.replace('/(worker)') : undefined);
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={goBack}><Text style={styles.back}>←</Text></Pressable>
            <Text style={styles.headerTitle}>Chụp ảnh & ghi nhật ký</Text>
            <View style={styles.headerSpacer} />
          </View>
        </TouchableWithoutFeedback>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View ref={contentRef} collapsable={false} style={{ gap: 18 }}>
              <View style={[styles.task, { gap: 12 }]}>
                <Pressable onPress={() => void locate()} onLayout={event => { fieldY.current.gps = event.nativeEvent.layout.y; }} style={[styles.gpsBox, draft.gps ? styles.gpsReady : styles.gpsPending, fieldErrors.gps && styles.invalid]} accessibilityLiveRegion="polite">
                  <Text style={styles.gpsTitle}>📍 Vị trí GPS</Text>
                  <Text style={[styles.gpsNote, draft.gps && styles.gpsReadyText]}>{gpsStatus}</Text>
                  <Text style={styles.gpsNote}>Chạm vào đây để lấy lại vị trí.</Text>
                </Pressable>
                {fieldError('gps')}
                {!draft.seasonId && activeSeasons.length === 0 && <Text style={styles.fieldError}>Chưa có mùa vụ đang canh tác. Báo người quản lý thiết lập mùa vụ trước khi gửi.</Text>}
                {fieldError('season')}
                <View onLayout={event => { fieldY.current.taskTitle = event.nativeEvent.layout.y; }}>
                {customTitle || (catalogLoaded && !taskTypes.length) ? <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Tên công việc *</Text>
                  <TextInput ref={titleRef} style={[styles.input, fieldErrors.taskTitle && styles.invalid]} value={draft.taskTitle} maxLength={50} placeholder="Nhập tên công việc khác" onFocus={() => revealInput(titleRef)} onChangeText={value => { updateDraft(old => ({ ...old, taskTitle: value })); if (value.trim()) clearFieldError('taskTitle'); }} />
                  {!!taskTypes.length && <Pressable onPress={() => { Keyboard.dismiss(); setCustomTitle(false); setTaskPickerOpen(true); updateDraft(old => ({ ...old, taskTitle: '' })); }}><Text style={styles.voiceHint}>Chọn lại từ danh sách công việc</Text></Pressable>}
                </View> : <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Tên công việc *</Text>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: taskPickerOpen }} onPress={() => { Keyboard.dismiss(); setTaskPickerOpen(open => !open); }} style={[styles.input, { justifyContent: 'center' }, fieldErrors.taskTitle && styles.invalid]}>
                    <Text style={{ color: draft.taskTitle ? colors.title : colors.muted }}>{draft.taskTitle || (catalogLoaded ? 'Chọn tên công việc' : 'Đang tải danh sách công việc…')}</Text>
                  </Pressable>
                  {taskPickerOpen && <View style={styles.optionList}>
                    {taskTypes.map((type, index) => <Pressable key={type} onPress={() => { updateDraft(old => ({ ...old, taskTitle: type })); setTaskPickerOpen(false); clearFieldError('taskTitle'); }} style={[styles.option, index < taskTypes.length - 1 && styles.optionBorder]}><Text style={styles.optionText}>{type}</Text></Pressable>)}
                    <Pressable onPress={() => { updateDraft(old => ({ ...old, taskTitle: '' })); setTaskPickerOpen(false); setCustomTitle(true); }} style={[styles.option, styles.customOption]}><Text style={styles.optionLink}>Khác — tự nhập tên công việc</Text></Pressable>
                  </View>}
                </View>}
                {fieldError('taskTitle')}</View>
                <View onLayout={event => { fieldY.current.area = event.nativeEvent.layout.y; }}>
                <AreaPicker label="Khu vực làm việc *" value={draft.area} options={availablePlots.map(plot => plot.code)} onChange={value => {
                  const selectedPlot = availablePlots.find(plot => plot.code === value);
                  updateDraft(old => ({ ...old, area: value, plotId: selectedPlot?.plot_id, seasonId: undefined }));
                  clearFieldError('area');
                }} />
                {fieldError('area')}</View>
                <View style={styles.noteField} onLayout={event => { fieldY.current.note = event.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Nội dung báo cáo *</Text>
                <TextInput ref={noteRef} accessibilityHint="Nội dung được gửi dưới dạng văn bản thuần, không phải HTML" style={[styles.note, fieldErrors.note && styles.invalid]} multiline textAlignVertical="top" value={draft.note} placeholder="Mô tả việc đã làm, kết quả và vấn đề cần tổ trưởng lưu ý…" onFocus={() => revealInput(noteRef)} onChangeText={value => { updateDraft(old => ({ ...old, note: value })); if (value.trim()) clearFieldError('note'); }} />
                {fieldError('note')}
                <VoiceInputButton {...voice} disabled={busy} />
                </View>
              </View>
              <View onLayout={event => { fieldY.current.photos = event.nativeEvent.layout.y; }} style={[styles.task, { gap: 12 }, fieldErrors.photos && styles.invalid]}>
                <Text style={styles.label}>Ảnh minh chứng · {draft.photos.length}/5</Text>
                {draft.photos.length ? (
                  <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
                    {draft.photos.map((uri, index) => (
                      <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                        <Pressable accessibilityLabel={`Xem toàn màn hình ảnh ${index + 1}`} onPress={() => { Keyboard.dismiss(); setSelectedPhoto(uri); }}>
                          <Image source={{ uri }} style={styles.photo} />
                        </Pressable>
                        <Pressable disabled={busy} style={styles.remove} onPress={() => { Keyboard.dismiss(); updateDraft(old => ({ ...old, photos: old.photos.filter((_, i) => i !== index) })); }}>
                          <Text style={styles.removeText}>Xóa ảnh {index + 1}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : <View style={styles.noPhoto}><Text style={styles.noPhotoText}>Chưa có ảnh minh chứng</Text></View>}
                <PrimaryButton title={busy ? 'Đang xử lý…' : '📷  Chụp ảnh'} disabled={busy || voice.busy || draft.photos.length >= 5} style={(busy || voice.busy || draft.photos.length >= 5) && styles.disabled} onPress={capture} />
                <Text style={styles.taskMeta}>{draft.photos.length < 2 ? `Chụp thêm ${2 - draft.photos.length} ảnh để có thể gửi.` : draft.photos.length >= 5 ? 'Đã đủ 5 ảnh. Bạn có thể xóa ảnh để chụp lại.' : 'Đã đủ ảnh. Bạn có thể chụp thêm hoặc gửi báo cáo.'}</Text>
                {fieldError('photos')}
                {!!error && <Text style={{ color: colors.danger }} accessibilityRole="alert">{error}</Text>}
              </View>
              <PrimaryButton title="Gửi báo cáo hoàn thành" disabled={busy || voice.busy} style={[styles.submitButton, (busy || voice.busy) && styles.disabled]} labelStyle={styles.submitButtonText} onPress={submitReport} />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
      <FullScreenImageViewer uri={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { ...shared.input },
  remove: { ...shared.button, ...shared.secondary, marginTop: 8 },
  removeText: { ...shared.link },
  disabled: { opacity: 0.45 },
  page: { ...shared.page },
  header: { ...shared.header },
  back: { ...shared.backText },
  headerTitle: { ...shared.title, flex: 1 },
  headerSpacer: { width: 24 },
  content: { ...shared.content },
  label: { ...shared.label },
  photoCount: { ...shared.chip, ...shared.chipText },
  photoList: { ...shared.photoList },
  photoWrapper: { width: 128 },
  photo: { ...shared.photo },
  noPhoto: { ...shared.secondary, borderRadius: 0, padding: 20, alignItems: "center" },
  noPhotoText: { ...shared.empty },
  task: { ...shared.card },
  taskMeta: { ...shared.muted },
  gpsBox: { borderWidth: 1, borderRadius: 0, padding: 12, gap: 4 },
  gpsPending: { backgroundColor: '#FFF8E7', borderColor: '#E9C46A' },
  gpsReady: { backgroundColor: '#EAF6E8', borderColor: '#75A96D' },
  gpsTitle: { ...shared.label, color: '#35583C' },
  gpsNote: { ...shared.muted, fontSize: 12 },
  gpsReadyText: { color: '#2F6F37' },
  note: { ...shared.input, minHeight: 76, textAlignVertical: "top" },
  noteField: { gap: 9 },
  submitButton: { minHeight: 54, paddingVertical: 15 },
  submitButtonText: { fontSize: 16 },
  optionList: { borderWidth: 1, borderColor: colors.border, borderRadius: 0, overflow: 'hidden', backgroundColor: colors.surface },
  option: { paddingHorizontal: 14, paddingVertical: 13 },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  customOption: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  optionText: { color: colors.text },
  optionLink: { color: colors.primary, fontWeight: '700' },
  invalid: { borderWidth: 1, borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 5 },
  voiceHint: { ...shared.link, paddingVertical: 8 },
});
