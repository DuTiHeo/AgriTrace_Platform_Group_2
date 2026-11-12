import * as ImagePicker from 'expo-image-picker';
import { RemovePhotoButton } from '@/components/common/remove_photo_button';
import { prepareLogPhoto } from '@/sevices/log_media';
import { uploadErrorPhoto } from '@/sevices/error_report_media';
import { photoUrl } from '@/sevices/farming_log.service';
import type { ComponentRef } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { AccountScreen } from '@/components/common/account_screen';
import { Button, Card, Empty, Input, Section } from '@/components/common/role_ui';
import { FullScreenImageViewer } from '@/components/common/full_screen_image_viewer';
import { useAccountUtilities } from '@/contexts/account_utilities_context';
import { useAuth } from '@/contexts/auth_context';
import { sharedStyles as s } from '@/styles/role_styles';
import { colors } from '@/styles/theme';
import { buildErrorReportPayload, createErrorReport, listErrorReports, errorReportKinds, type ErrorReport } from '@/sevices/error_report.service';

const PAGE_SIZE = 50;
const statuses = { new: 'Đã gửi', processing: 'Đã tiếp nhận', resolved: 'Đã xử lý', rejected: 'Từ chối' };
const statusColors = {
  new: { color: '#1D4ED8', backgroundColor: '#EFF6FF' },
  processing: { color: '#805211', backgroundColor: colors.warningSoft },
  resolved: { color: colors.title, backgroundColor: colors.successSoft },
  rejected: { color: '#B42318', backgroundColor: colors.dangerSoft }
};

export default function IssuesScreen() {
  const { draft, setDraft } = useAccountUtilities();
  const { accessToken } = useAuth();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pending = useRef(false);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const session = useRef(accessToken);
  useLayoutEffect(() => {
    session.current = accessToken;
    return () => { session.current = null; };
  }, [accessToken]);
  const sequence = useRef(0);

  const load = useCallback(async (nextOffset = 0) => {
    if (!accessToken) return;
    const requestId = ++sequence.current;
    setLoading(true); setLoadError('');
    try {
      const result = await listErrorReports(accessToken, { limit: PAGE_SIZE, offset: nextOffset });
      if (session.current !== accessToken || requestId !== sequence.current) return;
      setReports(old => nextOffset === 0 ? result : [...new Map([...old, ...result].map(report => [report.report_id, report])).values()]);
      setOffset(nextOffset + result.length);
      setHasMore(result.length === PAGE_SIZE);
    } catch (error) {
      if (session.current === accessToken && requestId === sequence.current)
        setLoadError(error instanceof Error ? error.message : 'Không tải được báo cáo lỗi.');
    } finally {
      if (session.current === accessToken && requestId === sequence.current) setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(useCallback(() => {
    setReports([]); setOffset(0); setHasMore(false);
    void load();
    return () => { ++sequence.current; };
  }, [load]));

  async function submit() {
    Keyboard.dismiss();
    if (pending.current) return;
    setMessage('');
    if (!accessToken) { setMessage('Vui lòng đăng nhập lại.'); return; }
    let payload;
    try { payload = buildErrorReportPayload({ ...draft, photo: undefined }); }
    catch (error) {
      setMessage(error instanceof Error ? error.message : 'Thông tin báo lỗi chưa hợp lệ.');
      if (draft.text.trim().length < 5) descriptionRef.current?.focus();
      return;
    }
    pending.current = true; setBusy(true);
    try {
      let screenshot = draft.uploadedPhotoUrl;
      if (draft.photo && !screenshot) {
        const uploaded = await uploadErrorPhoto(accessToken, draft.photo);
        if (session.current !== accessToken) return;
        screenshot = uploaded.screenshot_url;
        setDraft({ ...draft, uploadedPhotoUrl: screenshot });
      }
      const result = await createErrorReport(accessToken, { ...payload, ...(screenshot ? { screenshot_url: screenshot } : {}) });
      if (session.current !== accessToken) return;
      // Invalidate a list request that started before this report was submitted.
      ++sequence.current; setLoading(false);
      setReports(old => [result, ...old.filter(report => report.report_id !== result.report_id)]);
      setDraft({ kind: 'Lỗi chức năng', text: '' });
      setMessage('Đã gửi báo lỗi đến quản trị viên.');
      await load();
    } catch (error) {
      if (session.current === accessToken)
        setMessage(error instanceof Error ? error.message : 'Không gửi được báo lỗi. Nội dung đã được giữ lại để thử lại.');
    } finally {
      pending.current = false;
      if (session.current === accessToken) setBusy(false);
    }
  }

  async function choosePhoto() {
    if (pending.current || draft.photo) return;
    Keyboard.dismiss(); pending.current = true; setBusy(true); setMessage('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Vui lòng cho phép truy cập thư viện ảnh để tải ảnh báo lỗi.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 0.8 });
      if (!picked.canceled && picked.assets[0]) {
        const uri = await prepareLogPhoto(picked.assets[0].uri);
        if (session.current === accessToken) setDraft({ ...draft, photo: uri, uploadedPhotoUrl: undefined });
      }
    } catch (cause) {
      if (session.current === accessToken) setMessage(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh.');
    } finally { pending.current = false; if (session.current === accessToken) setBusy(false); }
  }

  function photo(uri: string, fullWidth = false) {
    return <Pressable accessibilityRole="button" accessibilityLabel="Xem ảnh báo lỗi" onPress={() => setSelectedPhoto(uri)}>
      <Image source={{ uri }} style={fullWidth ? [s.photo, { width: '100%', height: 200 }] : s.photo} resizeMode={fullWidth ? 'contain' : 'cover'} />
    </Pressable>;
  }

  return <AccountScreen title="Báo cáo sự cố">
    <Text style={s.muted}>Gửi thông tin lỗi hệ thống đến quản trị viên.</Text>
    <Card>
      <Text style={s.label}>Loại sự cố</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {errorReportKinds.map(kind => {
          const selected = kind.label === draft.kind;
          return (
            <Pressable
              key={kind.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: busy }}
              disabled={busy}
              onPress={() => {
                Keyboard.dismiss();
                setDraft({ ...draft, kind: kind.label });
              }}
              style={({ pressed }) => [
                s.button,
                s.secondary,
                selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                (busy || pressed) && { opacity: 0.5 }
              ]}
            >
              <Text style={[s.buttonText, !selected && { color: colors.primaryText }]}>{kind.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Input ref={descriptionRef} label="Mô tả sự cố *" placeholder="Bạn đang làm gì khi lỗi xảy ra?"
        multiline maxLength={3000} editable={!busy} value={draft.text}
        onChangeText={text => { setDraft({ ...draft, text }); setMessage(''); }} />
      <Button secondary title="Tải ảnh lên" disabled={busy || !!draft.photo} onPress={choosePhoto} />
      <Text style={s.muted}>Tối đa 1 ảnh, không quá 5 MB.</Text>
      {!!draft.photo && <View style={{ width: '100%' }}>
        {photo(draft.photo, true)}
        <RemovePhotoButton disabled={busy} onPress={() => setDraft({ ...draft, photo: undefined, uploadedPhotoUrl: undefined })} />
      </View>}
      {!!message && <Text accessibilityRole="alert" style={s.muted}>{message}</Text>}
      <Button title={busy ? 'Đang gửi…' : 'Gửi báo lỗi'} disabled={busy || !accessToken} onPress={submit} />
    </Card>
    <Section title="Báo cáo của bạn" />
    {!!loadError && <Card><Text accessibilityRole="alert" style={{ color: colors.danger }}>{loadError}</Text>
      <Button title="Thử tải lại" disabled={loading || busy} onPress={() => load()} /></Card>}
    {reports.map(report => <Card key={report.report_id}>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <Text style={[s.chip, s.chipText, statusColors[report.status]]}>{statuses[report.status] ?? report.status}</Text>
          <View style={[s.card, { padding: 10, gap: 5 }]}>
            <Text style={s.label}>Nội dung báo lỗi</Text>
            <Text style={s.body}>{report.description}</Text>
          </View>
          {!report.screenshot_url && <Text style={s.muted}>{new Date(report.submitted_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Text>}
        </View>
        {!!report.screenshot_url && <View style={{ width: s.photo.width, gap: 4 }}>
          {photo(photoUrl(report.screenshot_url))}
          <Text style={[s.muted, { textAlign: 'right' }]}>{new Date(report.submitted_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Text>
        </View>}
      </View>
      {!!report.admin_response && <View style={[s.card, { backgroundColor: colors.successSoft, padding: 10, gap: 5 }]}>
        <Text style={s.label}>Phản hồi từ quản trị viên</Text>
        <Text style={s.body}>{report.admin_response}</Text>
      </View>}
    </Card>)}
    {loading && <ActivityIndicator color={colors.primary} />}
    {!loading && !loadError && !reports.length && <Empty text="Bạn chưa gửi báo cáo sự cố." />}
    {hasMore && <Button secondary title="Xem thêm báo cáo" disabled={loading || busy} onPress={() => load(offset)} />}
    <FullScreenImageViewer uri={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
  </AccountScreen>;
}
