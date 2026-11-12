import { AccountUtilitiesProvider } from '@/contexts/account_utilities_context';
import { NotificationProvider } from '@/contexts/notification_context';
import { WorkScheduleProvider } from '@/contexts/work_schedule_context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated_icon';
import { ReportProvider } from '@/contexts/report_context';
import { AuthProvider } from '@/contexts/auth_context';
import { RecoveryProvider } from '@/contexts/recovery_context';
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              <AnimatedSplashOverlay />
            </View>
          </ReportProvider>
        </ThemeProvider>

      </NotificationProvider>
      </WorkScheduleProvider>
      </RecoveryProvider>
      </AccountUtilitiesProvider>
    </AuthProvider>
  );
}
