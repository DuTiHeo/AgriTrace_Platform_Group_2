import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { useVoiceInput } from '@/hooks/use-voice-input';
import { colors } from '@/styles/theme';

type Props = ReturnType<typeof useVoiceInput> & { disabled?: boolean };

export function VoiceInputButton({ phase, error, toggle, disabled }: Props) {
  const recording = phase === 'recording';
  const waiting = phase === 'preparing' || phase === 'processing';
  const label = phase === 'preparing' ? 'Đang mở microphone'
    : phase === 'processing' ? 'Đang chuyển thành văn bản'
    : recording ? 'Dừng và chuyển thành văn bản' : 'Thu âm';
  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || waiting, busy: waiting }}
      disabled={disabled || waiting} onPress={() => { Keyboard.dismiss(); void toggle(); }}
      style={({ pressed }) => [styles.button, recording && styles.recording, (disabled || waiting) && styles.disabled, pressed && styles.pressed]}>
      {waiting ? <ActivityIndicator size="large" color={colors.white} /> : recording
        ? <View style={styles.stop} />
        : <View style={styles.micIcon}><View style={styles.micHead} /><View style={styles.micCradle} /><View style={styles.micStem} /><View style={styles.micBase} /></View>}
    </Pressable>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
  button: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.primarySoft },
  recording: { backgroundColor: colors.danger, borderColor: colors.dangerSoft },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.8 },
  stop: { width: 25, height: 25, borderRadius: 4, backgroundColor: colors.white },
  micIcon: { width: 32, height: 42, alignItems: 'center' },
  micHead: { width: 14, height: 25, borderRadius: 7, backgroundColor: colors.white },
  micCradle: { position: 'absolute', top: 13, width: 28, height: 19, borderWidth: 3, borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderColor: colors.white },
  micStem: { width: 3, height: 12, backgroundColor: colors.white },
  micBase: { width: 18, height: 3, borderRadius: 2, backgroundColor: colors.white },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
