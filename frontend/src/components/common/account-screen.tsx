import { router, Redirect } from 'expo-router';
import { type PropsWithChildren } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth-context';
import { sharedStyles as s } from '@/styles/role-styles';
export function AccountScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Redirect href="/login" />;
  return <SafeAreaView style={s.page} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}><View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={10} onPress={() => { Keyboard.dismiss(); router.back(); }}><Text style={s.backText}>‹</Text></Pressable>
      <Text style={[s.section, { flex: 1 }]}>{title}</Text>
    </View></TouchableWithoutFeedback>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.content, { flexGrow: 1 }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}><View style={{ gap: 18, flexGrow: 1 }}>{children}</View></TouchableWithoutFeedback>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
