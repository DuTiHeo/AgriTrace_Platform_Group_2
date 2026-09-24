import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
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
import { useAuth } from '@/contexts/auth-context';
import { getMe, login } from '@/sevices/auth.sevice';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function signIn() {
    Keyboard.dismiss();

    if (submitting.current) return;

    setError(null);

    if (!phone.trim() || !password.trim()) {
      setError('Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const token = await login({
        phone: phone.trim(),
        password
      });

      const user = await getMe(token.access_token);

      if (user.role !== 'worker' && user.role !== 'leader') {
        throw new Error(
          'Vai trò tài khoản chưa được hỗ trợ trên ứng dụng.'
        );
      }

      setAuth(token.access_token, user);

      router.replace(
        (user.role === 'leader' ? '/(leader)' : '/(worker)') as Href
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.'
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      <SafeAreaView style={styles.page}>
        <View style={styles.content}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
          </View>

          <Text style={styles.brand}>AgriFarm</Text>

          <Text style={styles.title}>ĐĂNG NHẬP</Text>

          <Text style={styles.subtitle}>
            Đăng nhập để quản lý nông trại của bạn
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Số điện thoại</Text>

            <TextInput
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Mật khẩu</Text>

            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />

              <Pressable
                hitSlop={12}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowPassword((value) => !value);
                }}
              >
                <Text style={styles.eye}>
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.forgot}
              onPress={() => {
                Keyboard.dismiss();
                router.push('/forgot-password' as Href);
              }}
            >
              <Text style={styles.forgotText}>
                Quên mật khẩu?
              </Text>
            </Pressable>

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
              title={loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              disabled={loading}
              style={loading ? { opacity: 0.6 } : undefined}
              onPress={signIn}
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
    backgroundColor: '#FFFFFF'
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80
  },

  logoCard: {
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#172617',
    shadowOpacity: 0.17,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 5
  },

  logo: {
    width: 54,
    height: 54,
    resizeMode: 'contain'
  },

  brand: {
    textAlign: 'center',
    color: '#08BD28',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 14
  },

  title: {
    textAlign: 'center',
    color: '#1D3320',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 31
  },

  subtitle: {
    color: '#77847A',
    fontSize: 14,
    marginTop: 29
  },

  form: {
    marginTop: 18
  },

  label: {
    color: '#233626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
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
    fontSize: 15
  },

  passwordRow: {
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: '#F4F7F4',
    borderColor: '#E1E7E1',
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center'
  },

  passwordInput: {
    flex: 1,
    color: '#263828',
    fontSize: 15
  },

  eye: {
    color: '#2F8437',
    fontSize: 13,
    fontWeight: '700'
  },

  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 14
  },

  forgotText: {
    color: '#2F8437',
    fontSize: 13,
    fontWeight: '700'
  }
});