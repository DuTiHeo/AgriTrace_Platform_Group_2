import { type Href, router } from 'expo-router';
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
import { forgotPassword } from '@/sevices/auth.sevice';
import { useRecovery } from '@/contexts/recovery-context';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const phoneRef = useRef<TextInput>(null);
  const { setRecovery } = useRecovery();

  async function submit() {
    Keyboard.dismiss();

    if (pending.current) return;

    setError('');

    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      phoneRef.current?.focus();
      return;
    }

    pending.current = true;
    setLoading(true);
    setRecovery(null);

    try {
      const result = await forgotPassword(phone.trim());

      setRecovery({
        ...result,
        phone: phone.trim()
      });

      router.push('/verify-otp' as Href);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể yêu cầu mã xác nhận.'
      );
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

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
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>

        <View style={styles.content}>
          <View style={styles.lockCircle}>
            <Text style={styles.lock}>🔒</Text>
          </View>

          <Text style={styles.title}>Quên mật khẩu?</Text>

          <Text style={styles.description}>
            Nhập số điện thoại đã đăng ký để khôi phục mật khẩu. Chế độ thử
            nghiệm: mã OTP sẽ tự điền sau 5 giây, chưa gửi SMS thật.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Số điện thoại</Text>

            <TextInput
              ref={phoneRef}
              value={phone}
              onChangeText={value => { setPhone(value); if (value.trim()) setError(''); }}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại khôi phục"
              placeholderTextColor="#A6B1A7"
              style={[styles.input, error && !phone.trim() && { borderColor: '#B42318' }]}
            />

            {error ? (
              <Text
                accessibilityRole="alert"
                style={{
                  color: '#B42318',
                  marginBottom: 12
                }}
              >
                {error}
              </Text>
            ) : null}

            <PrimaryButton
              title={loading ? 'Đang kiểm tra…' : 'Lấy mã xác nhận'}
              disabled={loading}
              onPress={submit}
            />
          </View>
        </View>

        <Pressable
          style={styles.loginLink}
          onPress={() => {
            Keyboard.dismiss();
            router.replace('/login' as Href);
          }}
        >
          <Text style={styles.loginText}>Quay lại Đăng nhập</Text>
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 42
  },

  lockCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E5F3E7',
    justifyContent: 'center',
    alignItems: 'center'
  },

  lock: {
    color: '#2F8437',
    fontSize: 40,
    lineHeight: 46
  },

  title: {
    color: '#1D3320',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 24
  },

  description: {
    color: '#788579',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10
  },

  form: {
    alignSelf: 'stretch',
    marginTop: 22
  },

  label: {
    color: '#233626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },

  input: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#F4F7F4',
    borderColor: '#E1E7E1',
    borderWidth: 1,
    borderRadius: 9,
    color: '#263828',
    fontSize: 14,
    marginBottom: 23
  },

  loginLink: {
    alignItems: 'center',
    paddingBottom: 34
  },

  loginText: {
    color: '#2F8437',
    fontSize: 13,
    fontWeight: '700'
  },
});
