import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function AnimatedToggle({ active, accent = '#FF6333', disabled = false }) {
  const position = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: active ? 1 : 0,
      damping: 16,
      stiffness: 210,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [active, position]);

  return <View style={[styles.track, active && { backgroundColor: accent, borderColor: accent }, disabled && styles.disabled]}>
    <Animated.View style={[styles.thumb, {
      transform: [
        { translateX: position.interpolate({ inputRange: [0, 1], outputRange: [2, 21] }) },
        { scale: position.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.88, 1] }) },
      ],
    }]} />
  </View>;
}

const styles = StyleSheet.create({
  track: { width: 45, height: 26, justifyContent: 'center', borderRadius: 13, borderWidth: 1.5, borderColor: '#9AA8BD', backgroundColor: '#EEF1F5' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#10213E', shadowOpacity: .2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
  disabled: { opacity: .5 },
});
