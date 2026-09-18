import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../components/theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.content}>
        <View style={styles.logoTile}><Image source={require('../assets/hiu-logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <Text style={styles.brand}>Hiu</Text>
        <Text style={styles.tagline}>หิ้วของให้กัน ง่ายๆ ในหอพัก</Text>
        <Pressable style={({ pressed }) => [styles.startButton, pressed && styles.pressed]} onPress={() => navigation.replace('Login')}><Text style={styles.startText}>เริ่มต้นใช้งาน</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FF8551' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 45, backgroundColor: '#FF9F73' },
  logoTile: { width: 84, height: 84, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, shadowColor: '#9E3A1A', shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  logo: { width: 66, height: 66 },
  brand: { color: colors.white, fontWeight: '900', fontSize: 42, lineHeight: 48, marginTop: 13, letterSpacing: -1 },
  tagline: { color: colors.white, fontWeight: '700', fontSize: 15, marginTop: 2 },
  startButton: { width: 160, height: 51, backgroundColor: colors.white, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 50, shadowColor: '#A44425', shadowOpacity: 0.22, shadowRadius: 10, elevation: 4 },
  startText: { color: colors.primary, fontWeight: '900', fontSize: 15 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
});
