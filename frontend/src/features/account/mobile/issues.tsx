import type { ComponentRef } from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { AccountScreen } from '@/components/common/account_screen';
import { Button, Card, Chip, Empty, Input, Section } from '@/components/common/role_ui';
import { FullScreenImageViewer } from '@/components/common/full_screen_image_viewer';
import { useAccountUtilities } from '@/contexts/account_utilities_context';
import { useAuth } from '@/contexts/auth_context';
import { sharedStyles as s } from '@/styles/role_styles';
import { colors } from '@/styles/theme';
import { buildErrorReportPayload, createErrorReport, listErrorReports, errorReportKinds, type ErrorReport } from '@/sevices/error_report.service';

const PAGE_SIZE = 50;
const statuses = { new: 'Đã gửi', processing: 'Đang xử lý', resolved: 'Đã xử lý', rejected: 'Từ chối' };

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
    try { payload = buildErrorReportPayload(draft); }
    catch (error) {
      setMessage(error instanceof Error ? error.message : 'Thông tin báo lỗi chưa hợp lệ.');
      if (draft.text.trim().length < 5) descriptionRef.current?.focus();
      return;
    }
    pending.current = true; setBusy(true);
    try {
      const result = await createErrorReport(accessToken, payload);
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

  function photo(uri: string) {
    return <Pressable accessibilityRole="button" accessibilityLabel="Xem ảnh báo lỗi" onPress={() => setSelectedPhoto(uri)}>
      <Image source={{ uri }} style={s.photo} />
    </Pressable>;
  }

  return <AccountScreen title="Báo cáo sự cố">
    <Text style={s.muted}>Gửi thông tin lỗi hệ thống đến quản trị viên.</Text>
    <Card>
      <Text style={s.label}>Loại sự cố</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {errorReportKinds.map(kind => <Button key={kind.label} title={kind.label} disabled={busy}
          secondary={kind.label !== draft.kind} onPress={() => setDraft({ ...draft, kind: kind.label })} />)}
      </View>
      <Input ref={descriptionRef} label="Mô tả sự cố *" placeholder="Bạn đang làm gì khi lỗi xảy ra?"
        multiline maxLength={3000} editable={!busy} value={draft.text}
        onChangeText={text => { setDraft({ ...draft, text }); setMessage(''); }} />
      <Input label="Đường dẫn ảnh minh họa" placeholder="https://…" value={draft.photo ?? ''}
        maxLength={500} autoCapitalize="none" keyboardType="url" editable={!busy}
        onChangeText={photo => { setDraft({ ...draft, photo }); setMessage(''); }} />
      <Text style={s.muted}>API hiện hỗ trợ URL ảnh; chưa hỗ trợ tải ảnh từ điện thoại.</Text>
      {!!message && <Text accessibilityRole="alert" style={s.muted}>{message}</Text>}
      <Button title={busy ? 'Đang gửi…' : 'Gửi báo lỗi'} disabled={busy || !accessToken} onPress={submit} />
    </Card>
    <Section title="Báo cáo của bạn" />
    {!!loadError && <Card><Text accessibilityRole="alert" style={{ color: colors.danger }}>{loadError}</Text>
      <Button title="Thử tải lại" disabled={loading || busy} onPress={() => load()} /></Card>}
    {reports.map(report => <Card key={report.report_id}>
      <Chip text={statuses[report.status] ?? report.status} />
      <Text style={s.section}>{errorReportKinds.find(kind => kind.value === report.error_type)?.label ?? report.error_type ?? 'Khác'}</Text>
      <Text style={s.muted}>{report.description}</Text>
      <Text style={s.muted}>{new Date(report.submitted_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</Text>
      {!!report.screenshot_url && photo(report.screenshot_url)}
      {!!report.admin_response && <View style={{ gap: 6 }}><Text style={s.label}>Phản hồi từ quản trị viên</Text><Text style={s.muted}>{report.admin_response}</Text></View>}
    </Card>)}
    {loading && <ActivityIndicator color={colors.primary} />}
    {!loading && !loadError && !reports.length && <Empty text="Bạn chưa gửi báo cáo sự cố." />}
    {hasMore && <Button secondary title="Xem thêm báo cáo" disabled={loading || busy} onPress={() => load(offset)} />}
    <FullScreenImageViewer uri={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
  </AccountScreen>;
}
