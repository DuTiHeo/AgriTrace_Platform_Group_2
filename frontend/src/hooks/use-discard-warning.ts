import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Alert, BackHandler, Keyboard, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';

export function useDiscardWarning({
  dirty,
  onDiscard,
  bypassRef,
  title = 'Xác nhận thoát?',
  message = 'Nhật ký chưa được gửi. Bạn có xác nhận thoát không? Toàn bộ nội dung và ảnh đã chụp sẽ bị xóa.',
}: {
  dirty: boolean;
  onDiscard: () => void;
  bypassRef?: RefObject<boolean>;
  title?: string;
  message?: string;
}) {
  const navigation = useNavigation();
  const allowLeave = useRef(false);

  const confirmLeave = useCallback((action: () => void) => {
    if (allowLeave.current || bypassRef?.current) { action(); return; }
    const leave = () => {
      onDiscard();
      allowLeave.current = true;
      // Cho context kịp ghi nhận việc xóa bản nháp trước khi màn hình bị tháo khỏi cây UI.
      setTimeout(action, 0);
    };

    if (!dirty) { leave(); return; }
    Keyboard.dismiss();
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`${title}\n\n${message}`)) leave();
      return;
    }

    Alert.alert(title, message, [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Thoát và xóa', style: 'destructive', onPress: leave },
    ]);
  }, [bypassRef, dirty, message, onDiscard, title]);

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (allowLeave.current || bypassRef?.current) return;
    event.preventDefault();
    confirmLeave(() => navigation.dispatch(event.data.action));
  }), [bypassRef, confirmLeave, navigation]);

  useFocusEffect(useCallback(() => {
    allowLeave.current = false;
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave(() => navigation.goBack());
      return true;
    });
    return () => subscription.remove();
  }, [confirmLeave, navigation]));

  return useCallback((action?: () => void) => confirmLeave(action ?? (() => navigation.goBack())), [confirmLeave, navigation]);
}
