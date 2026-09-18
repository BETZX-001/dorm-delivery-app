import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { colors, spacing } from './theme';

export default function ProfilePageHeader({ navigation, icon, title, subtitle }) {
  const insets = useSafeAreaInsets();
  const { activeRole } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const dark = runner ? colors.runnerDark : colors.primaryDark;
  const soft = runner ? colors.softGreen : colors.softOrange;

  return <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16), backgroundColor: accent }]}>
    <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <View style={[styles.backIcon, { backgroundColor: soft }]}><Ionicons name="arrow-back" size={19} color={dark} /></View>
      <Text style={[styles.backText, { color: dark }]}>กลับหน้าโปรไฟล์</Text>
    </Pressable>
    <View style={styles.titleRow}>
      <View style={styles.icon}><Ionicons name={icon} size={24} color={accent} /></View>
      <View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.md, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, marginBottom: 17, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.96)' },
  backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 13, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  title: { color: colors.white, fontSize: 23, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,.87)', fontSize: 11, lineHeight: 16, marginTop: 3 },
  pressed: { opacity: .82, transform: [{ scale: .98 }] },
});
