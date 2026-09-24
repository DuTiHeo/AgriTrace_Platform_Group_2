import { colors } from '@/styles/theme';
import { sharedStyles as shared } from '@/styles/role-styles';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { useRecovery } from '@/contexts/recovery-context';
import { changePassword, forgotPassword } from '@/sevices/auth.sevice';
import { PrimaryButton } from './primary-button';

export function ChangePasswordScreen() {
  const { user, accessToken, clearAuth } = useAuth();
  const { setRecovery } = useRecovery();
  const [old, setOld] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);

  async function submit(recover = false) {
    Keyboard.dismiss();
    if (pending.current || !user || !accessToken) return;
    setError('');
    if (!recover) {
      if (!old || password.length < 8 || password !== password.trim() || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        setError('Nhập mật khẩu cũ. Mật khẩu mới cần ít nhất 8 ký tự, có chữ và số, không có khoảng trắng đầu/cuối.');
        return;
      }
      if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
      if (password === old) { setError('Mật khẩu mới phải khác mật khẩu cũ.'); return; }
    }
    pending.current = true;
    setBusy(true);
    try {
      if (recover) {
        const challenge = await forgotPassword(user.phone);
        setRecovery({ ...challenge, phone: user.phone });
        setOld(''); setPassword(''); setConfirm('');
        router.push('/verify-otp');
      } else {
        await changePassword(accessToken, old, password);
        setOld(''); setPassword(''); setConfirm('');
        setSuccess(true);
        setRecovery(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
    } finally { pending.current = false; setBusy(false); }
  }

  if (!user || !accessToken) return <Redirect href="/login" />;
  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={s.content}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ gap: 18, flexGrow: 1 }}>
              {!success && <Pressable disabled={busy} onPress={() => { Keyboard.dismiss(); router.back(); }}><Text style={s.link}>← Quay lại</Text></Pressable>}
              <Text style={s.title}>{success ? 'Đã cập nhật mật khẩu' : 'Đổi mật khẩu'}</Text>
              {success ? <>
                <Text style={s.muted}>Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại bằng mật khẩu mới.</Text>
                <PrimaryButton title="Về đăng nhập" onPress={() => { clearAuth(); router.replace('/login'); }} />
              </> : <View style={s.card}>
                <Text style={s.label}>Mật khẩu cũ</Text>
                <TextInput accessibilityLabel="Mật khẩu cũ" style={s.input} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={old} onChangeText={setOld} placeholder="Nhập mật khẩu hiện tại" />
                <Pressable disabled={busy} onPress={() => submit(true)}><Text style={s.link}>Quên mật khẩu cũ?</Text></Pressable>
                <Text style={s.label}>Mật khẩu mới</Text>
                <TextInput accessibilityLabel="Mật khẩu mới" style={s.input} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={password} onChangeText={setPassword} placeholder="Nhập mật khẩu mới" />
                <Text style={s.label}>Xác nhận mật khẩu mới</Text>
                <TextInput accessibilityLabel="Xác nhận mật khẩu mới" style={s.input} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={confirm} onChangeText={setConfirm} placeholder="Nhập lại mật khẩu mới" />
                <Text style={s.muted}>Ít nhất 8 ký tự, bao gồm chữ và số.</Text>
                {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
                <PrimaryButton title={busy ? 'Đang xử lý…' : 'Cập nhật mật khẩu'} disabled={busy} style={busy && { opacity: 0.5 }} onPress={() => submit()} />
              </View>}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { ...shared.page },
  content: { ...shared.content, flexGrow: 1 },
  title: { ...shared.title },
  card: { ...shared.card },
  label: { ...shared.label },
  input: { ...shared.input },
  muted: { ...shared.muted },
  link: { ...shared.link, paddingVertical: 8 },
  error: { color: colors.danger, lineHeight: 21 },
});
