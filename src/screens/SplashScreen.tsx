import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';

export const SPLASH_DURATION_MS = 1200;

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.58, 240);

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
          style={{ width: logoSize, height: logoSize }}
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
});
