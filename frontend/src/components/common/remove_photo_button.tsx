import { Keyboard, Pressable, StyleSheet, Text } from 'react-native';

export function RemovePhotoButton({ onPress, disabled = false, label = 'Xóa ảnh' }: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    hitSlop={6}
    onPress={() => {
      Keyboard.dismiss();
      onPress();
    }}
    style={({ pressed }) => [styles.button, (disabled || pressed) && styles.dimmed]}
  >
    <Text style={styles.cross}>×</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cross: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
  },
  dimmed: {
    opacity: 0.5,
  },
});
