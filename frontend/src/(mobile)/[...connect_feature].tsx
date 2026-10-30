import { Unmatched, useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';

import LoginScreen from '@/features/auth/mobile/login';
import ForgotPasswordScreen from '@/features/auth/mobile/forgot_password';
import VerifyOtpScreen from '@/features/auth/mobile/verify_otp';
import ResetPasswordScreen from '@/features/auth/mobile/reset_password';
import PersonalInfoScreen from '@/features/account/mobile/personal_info';
import ChangePasswordScreen from '@/features/account/mobile/change_password';
import SettingsScreen from '@/features/account/mobile/settings';
import NotificationSettingsScreen from '@/features/account/mobile/notification_settings';
import LanguageScreen from '@/features/account/mobile/language';
import IssuesScreen from '@/features/account/mobile/issues';

// Keep shared feature routes together instead of duplicating their folders in mobile.
const screens: Record<string, ComponentType> = {
  'auth/login': LoginScreen,
  'auth/forgot-password': ForgotPasswordScreen,
  'auth/verify-otp': VerifyOtpScreen,
  'auth/reset-password': ResetPasswordScreen,
  'account/personal-info': PersonalInfoScreen,
  'account/change-password': ChangePasswordScreen,
  'account/settings': SettingsScreen,
  'account/notification-settings': NotificationSettingsScreen,
  'account/language': LanguageScreen,
  'account/issues': IssuesScreen,
  // Existing auth screens also navigate using these short paths.
  login: LoginScreen,
  'forgot-password': ForgotPasswordScreen,
  'verify-otp': VerifyOtpScreen,
  'reset-password': ResetPasswordScreen,
};

export function generateStaticParams() {
  return Object.keys(screens).map(path => ({ connect_feature: path.split('/') }));
}

export default function SharedRoute() {
  const { connect_feature } = useLocalSearchParams<{ connect_feature?: string[] }>();
  const path = Array.isArray(connect_feature) ? connect_feature.join('/') : connect_feature ?? '';
  const Screen = Object.hasOwn(screens, path) ? screens[path] : undefined;

  return Screen ? <Screen key={path} /> : <Unmatched />;
}
