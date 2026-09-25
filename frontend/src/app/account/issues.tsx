import { useRef, useState } from 'react';
import { Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AccountScreen } from '@/components/common/account-screen';
import { Button, Card, Chip, Empty, Input, Section } from '@/components/common/role-ui';
import { FullScreenImageViewer } from '@/components/common/full-screen-image-viewer';
import { useAccountUtilities } from '@/contexts/account-utilities-context';
import { sharedStyles as s } from '@/styles/role-styles';
export default function IssuesScreen() {
  const { issues, draft, setDraft, saveIssue } = useAccountUtilities();
  const [message, setMessage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const descriptionRef = useRef<TextInput>(null);
  async function choosePhoto() {
    Keyboard.dismiss();
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled && result.assets[0]) setDraft({ ...draft, photo: result.assets[0].uri });
    } catch { setMessage('Không mở được thư viện ảnh. Vui lòng thử lại.'); }
    finally { pending.current = false; setBusy(false); }
  }
  function photo(uri: string) { return <Pressable accessibilityRole="button" accessibilityLabel="Xem ảnh sự cố toàn màn hình" onPress={() => { Keyboard.dismiss(); setSelectedPhoto(uri); }}><Image source={{ uri }} style={s.photo} /></Pressable>; }
  return <AccountScreen title="Báo cáo sự cố">
    <Text style={s.muted}>Ghi lại lỗi và hình ảnh liên quan. Báo cáo được lưu ở trạng thái chưa gửi.</Text>
    <Card><Text style={s.label}>Loại sự cố</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {['Lỗi chức năng', 'Lỗi hiển thị', 'Lỗi kết nối', 'Khác'].map(kind => <Button key={kind} title={kind} disabled={busy} secondary={kind !== draft.kind} onPress={() => setDraft({ ...draft, kind })} />)}
    </View><Input ref={descriptionRef} label="Mô tả sự cố *" placeholder="Bạn đang làm gì khi lỗi xảy ra?" multiline maxLength={3000} editable={!busy} value={draft.text} onChangeText={text => { setDraft({ ...draft, text }); if (text.trim()) setMessage(''); }} />
    {!!draft.photo && <>{photo(draft.photo)}<Button secondary title="Bỏ ảnh" disabled={busy} onPress={() => setDraft({ ...draft, photo: undefined })} /></>}
    <Button secondary title={busy ? 'Đang mở thư viện…' : '+ Đính kèm ảnh màn hình'} disabled={busy} onPress={choosePhoto} />
    {!!message && <Text accessibilityRole="alert" style={s.muted}>{message}</Text>}
    <Button title="Lưu báo cáo" disabled={busy} onPress={() => { if (!draft.text.trim()) { setMessage('Vui lòng nhập mô tả sự cố.'); descriptionRef.current?.focus(); return; } saveIssue(); setMessage('Đã lưu báo cáo. Chưa gửi đến quản trị viên.'); }} /></Card>
    <Section title="Báo cáo của bạn" />
    {issues.length ? issues.map(issue => <Card key={issue.id}><Chip text="CHƯA GỬI" /><Text style={s.section}>{issue.kind}</Text><Text style={s.muted}>{issue.text}</Text>{!!issue.photo && photo(issue.photo)}</Card>) : <Empty text="Bạn chưa tạo báo cáo sự cố." />}
    <FullScreenImageViewer uri={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
  </AccountScreen>;
}
