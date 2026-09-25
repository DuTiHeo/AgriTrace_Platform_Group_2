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
  const oldRef = useRef<TextInput>(null), passwordRef = useRef<TextInput>(null), confirmRef = useRef<TextInput>(null);
  const [errorField, setErrorField] = useState<'old' | 'password' | 'confirm' | ''>('');

  async function submit(recover = false) {
    Keyboard.dismiss();
    if (pending.current || !user || !accessToken) return;
    setError('');
    if (!recover) {
      if (!old) { setError('Vui lòng nhập mật khẩu cũ.'); setErrorField('old'); oldRef.current?.focus(); return; }
      if (password.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (password.trim() !== password || !password.trim()) { setError('Mật khẩu không được chứa khoảng trắng đầu/cuối hoặc toàn khoảng trắng.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (!/[a-zA-Z]/.test(password)) { setError('Mật khẩu mới phải chứa ít nhất 1 chữ cái.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (!/\d/.test(password)) { setError('Mật khẩu mới phải chứa ít nhất 1 chữ số.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (new Set(password).size === 1) { setError('Mật khẩu mới không được toàn ký tự giống nhau.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (password === old) { setError('Mật khẩu mới phải khác mật khẩu cũ.'); setErrorField('password'); passwordRef.current?.focus(); return; }
      if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); setErrorField('confirm'); confirmRef.current?.focus(); return; }
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
                <TextInput ref={oldRef} accessibilityLabel="Mật khẩu cũ" style={[s.input, errorField === 'old' && s.invalid]} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={old} onChangeText={value => { setOld(value); if (value && errorField === 'old') { setError(''); setErrorField(''); } }} placeholder="Nhập mật khẩu hiện tại" />
                <Pressable disabled={busy} onPress={() => submit(true)}><Text style={s.link}>Quên mật khẩu cũ?</Text></Pressable>
                <Text style={s.label}>Mật khẩu mới</Text>
                <TextInput ref={passwordRef} accessibilityLabel="Mật khẩu mới" style={[s.input, errorField === 'password' && s.invalid]} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={password} onChangeText={value => { setPassword(value); if (errorField === 'password') { setError(''); setErrorField(''); } }} placeholder="Nhập mật khẩu mới" />
                <Text style={s.label}>Xác nhận mật khẩu mới</Text>
                <TextInput ref={confirmRef} accessibilityLabel="Xác nhận mật khẩu mới" style={[s.input, errorField === 'confirm' && s.invalid]} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} value={confirm} onChangeText={value => { setConfirm(value); if (value === password && errorField === 'confirm') { setError(''); setErrorField(''); } }} placeholder="Nhập lại mật khẩu mới" />
                <Text style={s.muted}>Ít nhất 8 ký tự, bao gồm chữ và số, không khoảng trắng đầu/cuối, không toàn ký tự giống nhau.</Text>
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
  invalid: { borderColor: colors.danger },
});
