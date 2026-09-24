import { type PropsWithChildren } from 'react';
import { Keyboard, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { sharedStyles as s } from '@/styles/role-styles';
import { colors } from '@/styles/theme';

export function Avatar({
  name,
  small = false
}: {
  name: string;
  small?: boolean
}) {
  return (
    <View
      style={[
        s.avatar,
        small && {
          width: 38,
          height: 38
        }
      ]}
    >
      <Text style={s.avatarText}>
        {name.split(' ').slice(-2).map(x => x[0]).join('')}
      </Text>
    </View>
  );
}

export function Card({
  children
}: PropsWithChildren) {
  return (
    <View style={s.card}>
      {children}
    </View>
  );
}

export function Section({
  title,
  action,
  onPress
}: {
  title: string;
  action?: string;
  onPress?: () => void
}) {
  return (
    <View style={s.row}>
      <Text style={[s.section, { flex: 1 }]}>
        {title}
      </Text>

      {action && (
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            onPress?.();
          }}
        >
          <Text style={s.link}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  danger = false
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && s.dangerButton,
        (disabled || pressed) && { opacity: 0.5 }
      ]}
    >
      <Text
        style={[
          s.buttonText,
          secondary && { color: colors.primaryText },
          danger && s.dangerText
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  ...props
}: TextInputProps & {
  label: string
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>
        {label}
      </Text>

      <TextInput
        placeholderTextColor="#9AA99E"
        autoCapitalize="sentences"
        {...props}
        style={[
          s.input,
          props.multiline && {
            minHeight: 105,
            textAlignVertical: 'top'
          },
          props.style
        ]}
      />
    </View>
  );
}

export function Chip({
  text,
  tone = 'green'
}: {
  text: string;
  tone?: 'green' | 'amber' | 'gray'
}) {
  return (
    <View
      style={[
        s.chip,
        tone === 'amber' && {
          backgroundColor: '#FFF2DC'
        },
        tone === 'gray' && {
          backgroundColor: '#EFF2F0'
        }
      ]}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color:
            tone === 'amber'
              ? '#A66B16'
              : tone === 'gray'
                ? '#728078'
                : '#278046'
        }}
      >
        {text}
      </Text>
    </View>
  );
}

export function Status({
  status
}: {
  status: string
}) {
  return (
    <Chip
      text={
        status === 'done'
          ? 'Hoàn thành'
          : status === 'doing'
            ? 'Đang làm'
            : 'Cần làm'
      }
      tone={
        status === 'done'
          ? 'green'
          : status === 'doing'
            ? 'amber'
            : 'gray'
      }
    />
  );
}

export function Empty({
  text
}: {
  text: string
}) {
  return (
    <Text style={s.empty}>
      {text}
    </Text>
  );
}

export function Row({
  label,
  value
}: {
  label: string;
  value: string
}) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.muted, { flex: 1 }]}>
        {label}
      </Text>

      <Text style={s.value}>
        {value}
      </Text>
    </View>
  );
}

