import { requireOptionalNativeModule } from 'expo';
import { useFocusEffect } from 'expo-router';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { sharedStyles as s } from '@/styles/role_styles';
import { colors } from '@/styles/theme';

const speech = requireOptionalNativeModule<typeof ExpoSpeechRecognitionModule>('ExpoSpeechRecognition');

export function ReportDictation({ disabled, onTranscript }: {
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const requesting = useRef(false);
  const session = useRef(0);

  useFocusEffect(useCallback(() => {
    setListening(false);
    setMessage('');
    if (!speech) return;
    const result = speech.addListener('result', event => {
      const text = event.results[0]?.transcript.trim();
      if (active.current && event.isFinal && text) onTranscript(text);
    });
    const end = speech.addListener('end', () => {
      active.current = false;
      setListening(false);
    });
    const error = speech.addListener('error', event => {
      if (!active.current) return;
      active.current = false;
      setListening(false);
      setMessage(event.error === 'no-speech'
        ? 'Chưa nghe rõ lời nói. Bạn thử lại nhé.'
        : 'Không thể nhận dạng giọng nói. Bạn thử lại hoặc dùng mic trên bàn phím.');
    });
    return () => {
      session.current += 1;
      requesting.current = false;
      result.remove();
      end.remove();
      error.remove();
      if (active.current) speech.abort();
      active.current = false;
    };
  }, [onTranscript]));

  async function toggle() {
    if (requesting.current) return;
    if (!speech) {
      setMessage('Nút mic cần bản AgriFarm có tích hợp nhận dạng giọng nói. Trong Expo Go, hãy dùng mic trên bàn phím.');
      return;
    }
    if (active.current) {
      speech.stop();
      return;
    }

    const current = session.current;
    requesting.current = true;
    setMessage('');
    try {
      const permission = await speech.requestPermissionsAsync();
      if (session.current !== current) return;
      if (!permission.granted) {
        setMessage('Hãy cấp quyền micro và nhận dạng giọng nói để đọc nội dung báo cáo.');
        return;
      }
      active.current = true;
      setListening(true);
      speech.start({ lang: 'vi-VN', interimResults: false });
    } catch {
      if (session.current !== current) return;
      active.current = false;
      setListening(false);
      setMessage('Không thể bật mic trên thiết bị này.');
    } finally {
      if (session.current === current) requesting.current = false;
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Dừng nghe' : 'Nhập báo cáo bằng giọng nói'}
        disabled={disabled && !listening}
        style={[s.button, s.secondary, {
          alignSelf: 'center',
          width: 80,
          height: 80,
          padding: 0,
          borderRadius: 40
        }]}
        onPress={() => void toggle()}
      >
        <SymbolView name={{ ios: listening ? 'stop.fill' : 'mic.fill', android: listening ? 'stop' : 'mic', web: listening ? 'stop' : 'mic' }} size={40} tintColor={colors.primary} />
      </Pressable>
      {listening && <Text accessibilityLiveRegion="polite" style={s.muted}>Đang nghe tiếng Việt…</Text>}
      {!!message && <Text accessibilityRole="alert" style={s.body}>{message}</Text>}
    </View>
  );
}
