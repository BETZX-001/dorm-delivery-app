import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'เพศชาย', icon: 'male-outline' },
  { value: 'FEMALE', label: 'เพศหญิง', icon: 'female-outline' },
  { value: 'LGBTQ_PLUS', label: 'LGBTQ', icon: 'rainbow-outline' },
  { value: 'UNSPECIFIED', label: 'ไม่ต้องการระบุ', icon: 'remove-circle-outline' },
];

export default function GenderSelector({ value, onChange, error, accent = colors.primary, soft = colors.softOrange }) {
  return <View style={styles.wrap}>
    <Text style={styles.label}>เพศ</Text>
    <Text style={styles.hint}>เลือกข้อมูลที่ตรงกับคุณมากที่สุด</Text>
    <View style={styles.grid}>{GENDER_OPTIONS.map((option) => {
      const selected = value === option.value;
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.option, selected && { borderColor: accent, backgroundColor: soft }, pressed && styles.pressed]}>
        <View style={[styles.icon, selected && { backgroundColor: colors.white }]}><Ionicons name={option.icon} size={17} color={selected ? accent : colors.textSecondary} /></View>
        <Text style={[styles.optionText, selected && { color: accent }]}>{option.label}</Text>
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? accent : colors.border} />
      </Pressable>;
    })}</View>
    {!!error && <View style={styles.errorRow}><Ionicons name="alert-circle" size={14} color={colors.danger} /><Text style={styles.error}>{error}</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 13 }, label: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, hint: { color: colors.textSecondary, fontSize: 9, marginTop: 2, marginBottom: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { width: '48.5%', minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: '#FCFCFD' }, icon: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }, optionText: { flex: 1, color: colors.textPrimary, fontSize: 10, fontWeight: '800' }, errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }, error: { color: colors.danger, fontSize: 10, fontWeight: '700' }, pressed: { opacity: .78, transform: [{ scale: .985 }] },
});
