import { useFinishTabFlow } from '@/hooks/use-finish-tab-flow';
import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/common/primary-button';
import { FullScreenImageViewer } from '@/components/common/full-screen-image-viewer';
import { type ReportDraft, useReports } from '@/contexts/report-context';
import { useFarmingLogForm } from '@/hooks/use-farming-log-form';

export default function ReportNoteScreen() {
  const finishTabFlow = useFinishTabFlow();
  const params = useLocalSearchParams<{ taskTitle?: string; area?: string; taskId?: string }>();
  const taskTitle = typeof params.taskTitle === 'string' ? params.taskTitle : '';
  const area = typeof params.area === 'string' ? params.area : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  const draftKey = taskId ? `task:${taskId}` : JSON.stringify([taskTitle, area]);
  const { drafts, setDrafts } = useReports();
  const emptyDraft: ReportDraft = { taskTitle, area, taskId, note: '', photos: [] };
  const draft = drafts[draftKey] ?? emptyDraft;
  const updateDraft = useCallback((update: (old: ReportDraft) => ReportDraft) => {
    setDrafts(old => ({ ...old, [draftKey]: update(old[draftKey] ?? emptyDraft) }));
  }, [draftKey, setDrafts, taskTitle, area, taskId]);
  const { gpsStatus, preparePhoto, submit } = useFarmingLogForm(draft, updateDraft);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null), areaRef = useRef<TextInput>(null), noteRef = useRef<TextInput>(null);
  const fieldY = useRef<Record<string, number>>({});
  const pending = useRef(false);
  const submitted = useRef(false);
  useFocusEffect(useCallback(() => { submitted.current = false; setError(''); }, []));
  const clearFieldError = (name: string) => setFieldErrors(old => old[name] ? { ...old, [name]: '' } : old);
  const fieldError = (name: string) => fieldErrors[name] ? <Text accessibilityRole="alert" style={styles.fieldError}>{fieldErrors[name]}</Text> : null;
  function validate() {
    const errors: Record<string, string> = {};
    if (!draft.taskTitle.trim()) errors.taskTitle = 'Vui lòng nhập tên công việc.';
    if (!draft.area.trim()) errors.area = 'Vui lòng nhập khu vực thực hiện.';
    if (!draft.note.trim()) errors.note = 'Vui lòng nhập nội dung nhật ký.';
    if (draft.photos.length < 2) errors.photos = 'Cần ít nhất 2 ảnh minh chứng.';
    if (!draft.seasonId) errors.season = 'Chưa có mùa vụ đang canh tác.';
    if (!draft.gps) errors.gps = 'Chưa lấy được vị trí GPS.';
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, (fieldY.current[first] ?? 0) - 20), animated: true });
      ({ taskTitle: titleRef, area: areaRef, note: noteRef }[first])?.current?.focus();
    });
    return false;
  }

  async function capture() {
    Keyboard.dismiss();
    if (pending.current || draft.photos.length >= 5) return;
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
    if (pending.current || submitted.current || busy) return;
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
    router.replace((taskId ? '/(worker)/schedule' : '/(worker)') as never);
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={12} onPress={goBack}><Text style={styles.back}>←</Text></Pressable>
            <Text style={styles.headerTitle}>Chụp ảnh & ghi nhật ký</Text>
            <View style={styles.headerSpacer} />
          </View>
        </TouchableWithoutFeedback>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ gap: 18 }}>
              <View style={[styles.task, { gap: 12 }]}>
                <Text style={[styles.photoCount, { alignSelf: 'flex-start' }]}>BẢN NHÁP · CHƯA GỬI</Text>
                <Text style={styles.taskMeta}>Ảnh và ghi chú được giữ khi chuyển màn hình trong phiên hiện tại. Cần ít nhất 2 ảnh để gửi báo cáo.</Text>
                <View onLayout={event => { fieldY.current.gps = event.nativeEvent.layout.y; }} style={[styles.gpsBox, draft.gps ? styles.gpsReady : styles.gpsPending, fieldErrors.gps && styles.invalid]} accessibilityLiveRegion="polite">
                  <Text style={styles.gpsTitle}>📍 Vị trí GPS</Text>
                  <Text style={[styles.gpsNote, draft.gps && styles.gpsReadyText]}>{gpsStatus}</Text>
                </View>
                {fieldError('gps')}{fieldError('season')}
                <View onLayout={event => { fieldY.current.taskTitle = event.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Tên công việc *</Text>
                <TextInput ref={titleRef} style={[styles.input, fieldErrors.taskTitle && styles.invalid]} value={draft.taskTitle} maxLength={50} placeholder="Bạn vừa thực hiện công việc gì?" onChangeText={value => { updateDraft(old => ({ ...old, taskTitle: value })); if (value.trim()) clearFieldError('taskTitle'); }} />
                {fieldError('taskTitle')}</View>
                <View onLayout={event => { fieldY.current.area = event.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Khu vực *</Text>
                <TextInput ref={areaRef} style={[styles.input, fieldErrors.area && styles.invalid]} value={draft.area} maxLength={100} placeholder="Khu vực thực hiện" onChangeText={value => { updateDraft(old => ({ ...old, area: value })); if (value.trim()) clearFieldError('area'); }} />
                {fieldError('area')}</View>
                <View onLayout={event => { fieldY.current.note = event.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Nội dung nhật ký *</Text>
                <TextInput ref={noteRef} accessibilityHint="Có thể nhập bằng bàn phím hoặc dùng nút micro trên bàn phím điện thoại" style={[styles.note, fieldErrors.note && styles.invalid]} multiline textAlignVertical="top" value={draft.note} placeholder="Mô tả kết quả và những điều cần lưu ý…" onChangeText={value => { updateDraft(old => ({ ...old, note: value })); if (value.trim()) clearFieldError('note'); }} />
                {fieldError('note')}
                <Pressable accessibilityRole="button" onPress={() => noteRef.current?.focus()}><Text style={styles.voiceHint}>🎙 Nhập giọng nói bằng nút micro trên bàn phím</Text></Pressable>
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
                <PrimaryButton title={busy ? 'Đang xử lý…' : '📷  Chụp ảnh'} disabled={busy || draft.photos.length >= 5} style={(busy || draft.photos.length >= 5) && styles.disabled} onPress={capture} />
                <Text style={styles.taskMeta}>{draft.photos.length < 2 ? `Chụp thêm ${2 - draft.photos.length} ảnh để có thể gửi.` : draft.photos.length >= 5 ? 'Đã đủ 5 ảnh. Bạn có thể xóa ảnh để chụp lại.' : 'Đã đủ ảnh. Bạn có thể chụp thêm hoặc gửi báo cáo.'}</Text>
                {fieldError('photos')}
                {!!draft.photos.length && <Text style={styles.taskMeta}>Chạm vào ảnh để xem toàn màn hình.</Text>}
                {!!error && <Text style={{ color: colors.danger }} accessibilityRole="alert">{error}</Text>}
              </View>
              <PrimaryButton title="Gửi báo cáo hoàn thành" disabled={busy} style={busy && styles.disabled} onPress={submitReport} />
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
  noPhoto: { ...shared.secondary, borderRadius: 13, padding: 20, alignItems: "center" },
  noPhotoText: { ...shared.empty },
  task: { ...shared.card },
  taskMeta: { ...shared.muted },
  gpsBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  gpsPending: { backgroundColor: '#FFF8E7', borderColor: '#E9C46A' },
  gpsReady: { backgroundColor: '#EAF6E8', borderColor: '#75A96D' },
  gpsTitle: { ...shared.label, color: '#35583C' },
  gpsNote: { ...shared.muted, fontSize: 12 },
  gpsReadyText: { color: '#2F6F37' },
  note: { ...shared.input, minHeight: 105, textAlignVertical: "top" },
  invalid: { borderWidth: 1, borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 5 },
  voiceHint: { ...shared.link, paddingVertical: 8 },
});
