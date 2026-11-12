import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';
import { colors } from '@/styles/theme';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [imageReady, setImageReady] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // A missing image must never leave an invisible layer blocking the app.
    const fallback = setTimeout(() => setImageReady(true), 2000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!imageReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
        .start(({ finished }) => { if (finished) setVisible(false); });
    }, 900);
    return () => { clearTimeout(timer); opacity.stopAnimation(); };
  }, [imageReady, opacity]);

  if (!visible) return null;
  return <Animated.View style={[styles.overlay, { opacity }]} accessibilityViewIsModal>
    <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo AgriFarm" onLoadEnd={() => setImageReady(true)} />
    <Text style={styles.name}>AgriFarm</Text>
  </Animated.View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000, elevation: 1000, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  logo: { width: 160, height: 160 },
  name: { marginTop: 18, fontSize: 28, fontWeight: '700', color: colors.title },
});
