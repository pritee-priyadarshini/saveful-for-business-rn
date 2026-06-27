import React, { useEffect } from 'react';
import { Dimensions, Image, StatusBar, StyleSheet, View } from 'react-native';

export const SPLASH_DURATION_MS = 1200;

const { width } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width * 0.58, 240);

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={require('../../assets/intro/splash.png')}
        style={styles.background}
        resizeMode="cover"
      />
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/intro/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F4EE',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  logoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
