import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';

const SplashScreen = ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
  const animationRef = React.useRef<LottieView>(null);

  useEffect(() => {
    // Start animation immediately
    animationRef.current?.play();

    // Fallback timeout
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LottieView
        ref={animationRef}
        source={require('../assets/animations/splash_1.json')}
        autoPlay
        loop={false}
        resizeMode="cover"
        onAnimationFinish={onAnimationComplete}
        style={styles.animation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Must match your splash screen color
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen;