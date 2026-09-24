import { type Href, router } from 'expo-router';
import { useEffect } from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  useEffect(() => {
    const timer = setTimeout(
      () => router.replace('/login' as Href),
      1800
    );

    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/base.png')}
      style={styles.page}
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
          </View>

          <Text style={styles.brand}>AgriFarm</Text>

          <Text style={styles.tagline}>
            Kết nối nông nghiệp Việt
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#174D26',
    opacity: 0.33
  },

  safeArea: {
    flex: 1
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36
  },

  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C2712',
    shadowOpacity: 0.27,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5
    },
    elevation: 5
  },

  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain'
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    marginTop: 22
  },

  tagline: {
    color: '#F2FFF2',
    fontSize: 16,
    marginTop: 4
  }
});