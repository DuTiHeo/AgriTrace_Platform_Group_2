import { AccountUtilitiesProvider } from '@/contexts/account_utilities_context';
import { NotificationProvider } from '@/contexts/notification_context';
import { WorkScheduleProvider } from '@/contexts/work_schedule_context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated_icon';
import { ReportProvider } from '@/contexts/report_context';
import { AuthProvider } from '@/contexts/auth_context';
import { RecoveryProvider } from '@/contexts/recovery_context';
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <AccountUtilitiesProvider>
      <RecoveryProvider>
      <WorkScheduleProvider>
      <NotificationProvider>

        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ReportProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }} />
          </ReportProvider>
        </ThemeProvider>

      </NotificationProvider>
      </WorkScheduleProvider>
      </RecoveryProvider>
      </AccountUtilitiesProvider>
    </AuthProvider>
  );
}
