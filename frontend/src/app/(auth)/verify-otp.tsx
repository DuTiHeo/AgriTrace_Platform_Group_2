import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { useRecovery } from '@/contexts/recovery-context';
import { forgotPassword, verifyOtp } from '@/sevices/auth.sevice';

export default function VerifyOtpScreen() {
  const { recovery, setRecovery } = useRecovery();
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    setOtp('');
    setSeconds(5);

    const countdown = setInterval(
      () => setSeconds(value => Math.max(0, value - 1)),
      1000
    );

    const fill = recovery?.demo_otp ? setTimeout(
      () => setOtp(recovery.demo_otp ?? ''),
      5000
    ) : undefined;

    return () => {
      clearInterval(countdown);
      if (fill) clearTimeout(fill);
    };
  }, [recovery?.challenge, recovery?.demo_otp]);

  async function confirm() {
    Keyboard.dismiss();

    if (!recovery || pending.current) return;

    if (!/^\d{4}$/.test(otp)) {
      setError('Vui lòng nhập đủ 4 chữ số.');
      otpRef.current?.focus();
      return;
    }

    pending.current = true;
    setLoading(true);
    setError('');

    try {
      const result = await verifyOtp(recovery.challenge, otp);

      setRecovery({
        ...recovery,
        resetToken: result.reset_token
      });

      router.replace('/reset-password');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể xác minh OTP.'
      );
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  async function resend() {
    Keyboard.dismiss();

    if (!recovery || pending.current) return;

    pending.current = true;
    setLoading(true);
    setError('');

    try {
      setRecovery({
        ...await forgotPassword(recovery.phone),
        phone: recovery.phone
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lấy mã mới.'
      );
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  if (!recovery)
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
            Nhập mã xác nhận
          </Text>

          <Text style={styles.description}>
            Khôi phục tài khoản {recovery.phone.slice(0, 3)}***
            {recovery.phone.slice(-3)}
          </Text>

          <TextInput
            ref={otpRef}
            accessibilityLabel="Mã OTP"
            value={otp}
            onChangeText={value => { const next = value.replace(/\D/g, '').slice(0, 4); setOtp(next); if (next.length === 4) setError(''); }}
            keyboardType="number-pad"
            maxLength={4}
            editable={!loading}
            placeholder="0000"
            style={{
              ...styles.otpBox,
              ...styles.otpText,
              width: 240,
              textAlign: 'center',
              letterSpacing: 14,
              marginTop: 26
            }}
          />

          <Text style={styles.resendLabel}>
            {recovery.demo_otp
              ? (
                  seconds > 0
                    ? `OTP thử nghiệm tự điền sau ${seconds}s`
                    : 'OTP thử nghiệm đã tự điền. Nhấn Xác nhận.'
                )
              : 'Nhập mã OTP của bạn.'}
          </Text>

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

          <Pressable
            disabled={loading || seconds > 0}
            onPress={resend}
          >
            <Text style={styles.resendText}>
              Lấy mã mới
            </Text>
          </Pressable>

          <PrimaryButton
            title={loading ? 'Đang xử lý…' : 'Xác nhận'}
            disabled={loading}
            onPress={confirm}
            style={styles.confirm}
          />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80
  },

  title: {
    color: '#1D3320',
    fontSize: 21,
    fontWeight: '800'
  },

  description: {
    color: '#788579',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 270,
    marginTop: 8
  },

  otpRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 26
  },

  otpBox: {
    width: 54,
    height: 54,
    backgroundColor: '#F4F7F4',
    borderWidth: 1,
    borderColor: '#E1E7E1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  focusedBox: {
    borderColor: '#2F8437',
    borderWidth: 2
  },

  otpText: {
    color: '#1D3320',
    fontWeight: '800',
    fontSize: 20
  },

  resendLabel: {
    color: '#788579',
    fontSize: 13,
    marginTop: 27
  },

  resendText: {
    color: '#2F8437',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7
  },

  confirm: {
    alignSelf: 'stretch',
    marginTop: 27
  }
});
