import { sharedStyles as shared } from '@/styles/role-styles';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from 'react-native';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  style?: StyleProp<ViewStyle>
};

export function PrimaryButton({
  title,
  style: customStyle,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        (pressed || props.disabled) && styles.pressed,
        customStyle
      ]}
    >
      <Text style={styles.label}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { ...shared.button },

  pressed: {
    opacity: 0.82
  },

  label: { ...shared.buttonText }
});