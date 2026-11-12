import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth_context';
import { transcribeRecordedAudio } from '@/sevices/log_media';
import { sharedStyles as s } from '@/styles/role_styles';
import { colors } from '@/styles/theme';

const MAX_RECORDING_MS = 60_000;

export function ReportDictation({ disabled, onTranscript }: {
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const { accessToken } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(false);
  const requesting = useRef(false);
  const session = useRef(0);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMaxTimer = useCallback(() => {
    if (maxTimer.current) {
      clearTimeout(maxTimer.current);
      maxTimer.current = null;
    }
  }, []);

  const stopAndTranscribe = useCallback(async (currentSession: number) => {
    clearMaxTimer();
    if (!active.current) return;
    active.current = false;
    requesting.current = true;
    setListening(false);
    setTranscribing(true);
    setMessage('');

    let recordedUri: string | null = null;
    try {
      await recorder.stop();
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      recordedUri = recorder.uri;

      if (session.current !== currentSession) return;
      if (!recordedUri) {
        setMessage('Không thu được âm thanh. Bạn thử lại nhé.');
        return;
      }
      if (!accessToken) {
        setMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const text = await transcribeRecordedAudio(accessToken, recordedUri);
      if (session.current !== currentSession) return;

      if (text) {
        onTranscript(text);
      } else {
        setMessage('Chưa nghe rõ lời nói. Bạn thử lại nhé.');
      }
    } catch (err) {
      if (session.current !== currentSession) return;
      setMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể chuyển giọng nói thành văn bản. Bạn thử lại nhé.',
      );
    } finally {
      if (recordedUri && Platform.OS !== 'web') {
        void FileSystem.deleteAsync(recordedUri, { idempotent: true }).catch(() => undefined);
      }
      if (session.current === currentSession) {
        requesting.current = false;
        setTranscribing(false);
      }
    }
  }, [accessToken, clearMaxTimer, onTranscript, recorder]);

  useFocusEffect(useCallback(() => {
    setListening(false);
    setTranscribing(false);
    setMessage('');
    return () => {
      session.current += 1;
      requesting.current = false;
      clearMaxTimer();
      if (active.current) {
        active.current = false;
        void recorder.stop().catch(() => undefined);
        void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
    };
  }, [clearMaxTimer, recorder]));

  async function toggle() {
    if (requesting.current || transcribing) return;

    if (active.current) {
      await stopAndTranscribe(session.current);
      return;
    }

    const current = session.current;
    requesting.current = true;
    setMessage('');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (session.current !== current) return;
      if (!permission.granted) {
        setMessage('Hãy cấp quyền micro để ghi âm nội dung báo cáo.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (session.current !== current) return;

      await recorder.prepareToRecordAsync();
      if (session.current !== current) return;

      recorder.record();
      active.current = true;
      setListening(true);

      clearMaxTimer();
      maxTimer.current = setTimeout(() => {
        void stopAndTranscribe(current);
      }, MAX_RECORDING_MS);
    } catch {
      if (session.current !== current) return;
      active.current = false;
      setListening(false);
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      setMessage('Không thể bật mic trên thiết bị này.');
    } finally {
      if (session.current === current) requesting.current = false;
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          transcribing
            ? 'Đang chuyển giọng nói thành văn bản'
            : listening
              ? 'Dừng ghi âm và chuyển thành văn bản'
              : 'Nhập báo cáo bằng giọng nói'
        }
        disabled={(disabled && !listening) || transcribing}
        style={[s.button, s.secondary, {
          alignSelf: 'center',
          width: 80,
          height: 80,
          padding: 0,
          borderRadius: 40
        }]}
        onPress={() => void toggle()}
      >
        {transcribing ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <SymbolView
            name={{
              ios: listening ? 'stop.fill' : 'mic.fill',
              android: listening ? 'stop' : 'mic',
              web: listening ? 'stop' : 'mic',
            }}
            size={40}
            tintColor={colors.primary}
          />
        )}
      </Pressable>
      {listening && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Đang ghi âm tiếng Việt… Nhấn lại để chuyển thành chữ (tối đa 60 giây)
        </Text>
      )}
      {transcribing && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Đang chuyển giọng nói thành văn bản…
        </Text>
      )}
      {!!message && <Text accessibilityRole="alert" style={s.body}>{message}</Text>}
    </View>
  );
}
