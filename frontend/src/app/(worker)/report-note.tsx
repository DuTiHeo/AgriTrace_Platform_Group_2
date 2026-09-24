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

export default function ReportNoteScreen() {
  const finishTabFlow = useFinishTabFlow();
  const params = useLocalSearchParams<{ taskTitle?: string; area?: string; taskId?: string }>();
  const taskTitle = typeof params.taskTitle === 'string' ? params.taskTitle : '';
  const area = typeof params.area === 'string' ? params.area : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  const draftKey = taskId ? `task:${taskId}` : JSON.stringify([taskTitle, area]);
  const { drafts, setDrafts, createReport } = useReports();
  const emptyDraft: ReportDraft = { taskTitle, area, taskId, note: '', photos: [] };
  const draft = drafts[draftKey] ?? emptyDraft;
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submitted = useRef(false);
  useFocusEffect(useCallback(() => { submitted.current = false; setError(''); }, []));
  const canSubmit = !busy && draft.photos.length >= 2 && !!draft.taskTitle.trim() && !!draft.area.trim();

  function updateDraft(update: (old: ReportDraft) => ReportDraft) {
    setDrafts(old => ({ ...old, [draftKey]: update(old[draftKey] ?? emptyDraft) }));
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
        const uri = result.assets[0].uri;
        updateDraft(old => ({ ...old, photos: [...old.photos, uri].slice(0, 5) }));
      }
    } catch {
      setError('Không mở được camera. Vui lòng kiểm tra quyền hoặc dùng thiết bị có camera.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function submitReport() {
    Keyboard.dismiss();
    if (!canSubmit || pending.current || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
    await createReport({ ...draft, taskTitle: draft.taskTitle.trim(), area: draft.area.trim(), note: draft.note.trim() });
    setDrafts(old => {
      const next = { ...old };
      delete next[draftKey];
      return next;
    });
    finishTabFlow('diary');
    } catch (e) { submitted.current = false; setError(e instanceof Error ? e.message : 'Không lưu được báo cáo.'); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="Quay lại" hitSlop={12} onPress={() => { Keyboard.dismiss(); router.back(); }}><Text style={styles.back}>←</Text></Pressable>
            <Text style={styles.headerTitle}>Chụp ảnh & ghi nhật ký</Text>
            <View style={styles.headerSpacer} />
          </View>
        </TouchableWithoutFeedback>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ gap: 18 }}>
              <View style={[styles.task, { gap: 12 }]}>
                <Text style={[styles.photoCount, { alignSelf: 'flex-start' }]}>BẢN NHÁP · CHƯA GỬI</Text>
                <Text style={styles.taskMeta}>Ảnh và ghi chú được giữ khi chuyển màn hình trong phiên hiện tại. Cần ít nhất 2 ảnh để gửi báo cáo.</Text>
                <Text style={styles.label}>Tên công việc *</Text>
                <TextInput style={styles.input} value={draft.taskTitle} maxLength={100} placeholder="Bạn vừa thực hiện công việc gì?" onChangeText={value => updateDraft(old => ({ ...old, taskTitle: value }))} />
                <Text style={styles.label}>Khu vực *</Text>
                <TextInput style={styles.input} value={draft.area} maxLength={100} placeholder="Khu vực thực hiện" onChangeText={value => updateDraft(old => ({ ...old, area: value }))} />
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput style={styles.note} multiline textAlignVertical="top" value={draft.note} placeholder="Mô tả kết quả và những điều cần lưu ý…" onChangeText={value => updateDraft(old => ({ ...old, note: value }))} />
              </View>
              <View style={[styles.task, { gap: 12 }]}>
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
                <PrimaryButton title={busy ? 'Đang mở camera…' : '📷  Chụp ảnh'} disabled={busy || draft.photos.length >= 5} style={(busy || draft.photos.length >= 5) && styles.disabled} onPress={capture} />
                <Text style={styles.taskMeta}>{draft.photos.length < 2 ? `Chụp thêm ${2 - draft.photos.length} ảnh để có thể gửi.` : draft.photos.length >= 5 ? 'Đã đủ 5 ảnh. Bạn có thể xóa ảnh để chụp lại.' : 'Đã đủ ảnh. Bạn có thể chụp thêm hoặc gửi báo cáo.'}</Text>
                {!!draft.photos.length && <Text style={styles.taskMeta}>Chạm vào ảnh để xem toàn màn hình.</Text>}
                {!!error && <Text style={{ color: colors.danger }} accessibilityRole="alert">{error}</Text>}
              </View>
              <PrimaryButton title="Gửi báo cáo hoàn thành" disabled={!canSubmit} style={!canSubmit && styles.disabled} onPress={submitReport} />
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
  headerSpacer: {
    width: 24,
  },
  content: { ...shared.content },
  label: { ...shared.label },
  photoCount: { ...shared.chip, ...shared.chipText },
  photoList: { ...shared.photoList },
  photoWrapper: {
    width: 128,
  },
  photo: { ...shared.photo },
  noPhoto: { ...shared.secondary, borderRadius: 13, padding: 20, alignItems: "center" },
  noPhotoText: { ...shared.empty },
  task: { ...shared.card },
  taskMeta: { ...shared.muted },
  note: { ...shared.input, minHeight: 105, textAlignVertical: "top" },
});
