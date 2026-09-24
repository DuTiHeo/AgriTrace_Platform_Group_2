import { AccountUtilitiesProvider } from '@/contexts/account-utilities-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { WorkScheduleProvider } from '@/contexts/work-schedule-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ReportProvider } from '@/contexts/report-context';
import { AuthProvider } from '@/contexts/auth-context';
import { RecoveryProvider } from '@/contexts/recovery-context';
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
