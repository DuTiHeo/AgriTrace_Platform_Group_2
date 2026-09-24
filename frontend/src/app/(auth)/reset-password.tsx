import { type Href, Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common/primary-button';
import { resetPassword } from '@/sevices/auth.sevice';
import { useRecovery } from '@/contexts/recovery-context';
import { useAuth } from '@/contexts/auth-context';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);
  const { recovery, setRecovery } = useRecovery();
  const { clearAuth } = useAuth();

  async function submit() {
    Keyboard.dismiss();

    if (pending.current || !recovery?.resetToken) return;

    setError('');

    if (
      password.length < 8 ||
      password !== password.trim() ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        'Mật khẩu cần ít nhất 8 ký tự, có chữ và số, không có khoảng trắng đầu/cuối.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    pending.current = true;
    setLoading(true);

    try {
      await resetPassword(recovery.resetToken, password);
      clearAuth();
      setSuccess(true);
      setRecovery(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật mật khẩu.'
      );
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (success)
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Đã cập nhật mật khẩu
          </Text>

          <Text style={styles.description}>
            Bạn có thể đăng nhập bằng mật khẩu mới.
          </Text>

          <PrimaryButton
            title="Về đăng nhập"
            style={styles.button}
            onPress={() => router.replace('/login' as Href)}
          />
        </View>
      </SafeAreaView>
    );

  if (!recovery?.resetToken)
    return <Redirect href="/forgot-password" />;

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <SafeAreaView style={styles.page}>
        <Pressable
          style={styles.back}
          onPress={() => {
            Keyboard.dismiss();
            router.back();
          }}
        >
          <Text style={styles.backText}>
            ← Quay lại
          </Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>
            Đặt mật khẩu mới
          </Text>

          <Text style={styles.description}>
            Tạo mật khẩu mới để bảo vệ tài khoản của bạn.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Mật khẩu mới
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor="#A6B1A7"
              style={styles.input}
            />

            <Text style={styles.label}>
              Xác nhận mật khẩu mới
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#A6B1A7"
              style={styles.input}
            />

            {error ? (
              <Text
                accessibilityRole="alert"
                style={{
                  color: '#B42318',
                  marginTop: 12
                }}
              >
                {error}
              </Text>
            ) : null}

            <PrimaryButton
              title={loading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
              disabled={loading}
              onPress={submit}
              style={styles.button}
            />
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28
  },

  back: {
    paddingTop: 16,
    paddingBottom: 18
  },

  backText: {
    color: '#1D3320',
    fontSize: 16,
    fontWeight: '700'
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80
  },

  title: {
    color: '#1D3320',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },

  description: {
    color: '#788579',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10
  },

  form: {
    marginTop: 30
  },

  label: {
    color: '#233626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14
  },

  input: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#F4F7F4',
    borderColor: '#E1E7E1',
    borderWidth: 1,
    borderRadius: 9,
    color: '#263828',
    fontSize: 14
  },

  button: {
    marginTop: 28
  }
});