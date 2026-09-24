import { useAccountUtilities } from '@/contexts/account-utilities-context';
import { PersonalAvatarButton } from '@/components/common/personal-avatar-button';
import { sharedStyles as s } from '@/styles/role-styles';
export { sharedStyles as s } from '@/styles/role-styles';
import { Button } from '@/components/common/role-ui';
export { Avatar, Button, Card, Section, Input, Chip, Status, Empty, Row } from '@/components/common/role-ui';
import { router, type Href } from 'expo-router';
import { useState, type RefObject, type PropsWithChildren } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/contexts/auth-context';
import { useLeader } from '@/contexts/leader-context';

export const go = (path: string, id?: string) =>
  router.push(
    (id
      ? { pathname: `/(leader)/${path}`, params: { id } }
      : `/(leader)/${path}`) as Href
  );

export const dateText = (value: string) =>
  new Date(
    value.length === 10 ? value + 'T12:00:00' : value
  ).toLocaleDateString('vi-VN');

export function Screen({
  children,
  title,
  back = false,
  scrollRef
}: PropsWithChildren<{
  title?: string;
  back?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
}>) {
  const { user } = useAuth();
  const { showBadge } = useAccountUtilities();
  const { notices } = useLeader();
  const unread = notices.filter(n => !n.read).length;

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <View style={s.header}>
            {back ? (
              <>
                <Pressable
                  accessibilityLabel="Quay lại"
                  onPress={() => {
                    Keyboard.dismiss();
                    router.back();
                  }}
                  style={s.back}
                >
                  <Text style={s.backText}>
                    ‹
                  </Text>
                </Pressable>

                <Text style={[s.title, { flex: 1 }]}>
                  {title}
                </Text>
              </>
            ) : (
              <>
                <PersonalAvatarButton role="leader" />
                <View style={{ flex: 1 }}>
                  <Text style={s.muted}>
                    Tổ trưởng phụ trách
                  </Text>

                  <Text style={s.name}>
                    {user?.full_name ?? 'Tổ trưởng'}
                  </Text>
                </View>

                <Pressable
                  accessibilityLabel="Thông báo"
                  style={s.bell}
                  onPress={() => {
                    Keyboard.dismiss();
                    go('notifications');
                  }}
                >
                  <SymbolView
                    name={{
                      ios: 'bell',
                      android: 'notifications',
                      web: 'notifications'
                    }}
                    size={23}
                    tintColor="#35573C"
                  />

                  {showBadge && unread > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>
                        {unread}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.content}
        >

          {!back && title && (
            <Text style={s.title}>
              {title}
            </Text>
          )}

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Calendar({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  const year = month.getFullYear(),
    m = month.getMonth();

  const shift =
    (new Date(year, m, 1).getDay() + 6) % 7;

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>
        Hạn hoàn thành
      </Text>

      <Button
        secondary
        title={value ? `▦  ${dateText(value)}` : '▦  Chọn ngày'}
        onPress={() => setOpen(true)}
      />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.calendar}>
            <View style={s.row}>
              <Button
                secondary
                title="‹"
                onPress={() =>
                  setMonth(new Date(year, m - 1, 1))
                }
              />

              <Text style={s.section}>
                Tháng {m + 1} / {year}
              </Text>

              <Button
                secondary
                title="›"
                onPress={() =>
                  setMonth(new Date(year, m + 1, 1))
                }
              />
            </View>

            <View style={s.grid}>
              {['T2','T3','T4','T5','T6','T7','CN'].map(x => (
                <Text
                  key={x}
                  style={s.day}
                >
                  {x}
                </Text>
              ))}

              {Array.from(
                {
                  length:
                    shift +
                    new Date(year, m + 1, 0).getDate()
                },
                (_, i) => {
                  const d = i - shift + 1;
                  const v = `${year}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

                  return (
                    <Pressable
                      key={i}
                      disabled={d < 1}
                      style={[
                        s.dayCell,
                        v === value && {
                          backgroundColor: '#E3F2E5'
                        }
                      ]}
                      onPress={() => {
                        onChange(v);
                        setOpen(false);
                      }}
                    >
                      <Text style={{ color: '#24442C' }}>
                        {d > 0 ? d : ''}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <Button
              secondary
              title="Đóng"
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

