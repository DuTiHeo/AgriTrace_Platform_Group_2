import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

export function AnimatedSplashOverlay() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return null;
}
