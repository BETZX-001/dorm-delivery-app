// App.js
import React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './AuthContext';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  const { width } = useWindowDimensions();
  const useCenteredFrame = Platform.OS === 'web' && width >= 700;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.page}>
          <View style={[styles.appFrame, useCenteredFrame && styles.centeredFrame]}>
            <RootNavigator />
          </View>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#EEF2F7' : '#FFFFFF',
  },
  // On web, keep the app vertically full-height while centering a focused
  // app canvas. Native screens still use the entire device width.
  appFrame: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  centeredFrame: {
    maxWidth: 520,
    alignSelf: 'center',
  },
});
