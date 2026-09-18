import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { colors } from '../components/theme';

export default function ForgotPasswordScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function submit() {
    const value = email.trim().toLowerCase();
    if (!value) return Alert.alert('กรอกอีเมลก่อน', 'กรุณากรอกอีเมลที่ใช้สมัครสมาชิก');
    if (!value.endsWith('@psu.ac.th')) return Alert.alert('อีเมลไม่ถูกต้อง', 'กรุณาใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @psu.ac.th');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, value);
      Alert.alert('ส่งลิงก์แล้ว', 'ตรวจสอบอีเมลของคุณ แล้วกดลิงก์เพื่อตั้งรหัสผ่านใหม่', [{ text: 'ตกลง', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('ดำเนินการไม่สำเร็จ', error.code === 'auth/user-not-found' ? 'ไม่พบบัญชีผู้ใช้นี้' : 'ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบอีเมลแล้วลองใหม่');
    } finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.frame}>
        <View style={styles.hero}>
          <View style={styles.orb} />
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.primaryDark} /></View><Text style={styles.backText}>กลับหน้าเข้าสู่ระบบ</Text></Pressable>
          <View style={styles.heroIcon}><Ionicons name="key-outline" size={29} color={colors.primary} /></View>
          <Text style={styles.heroTitle}>ตั้งรหัสผ่านใหม่</Text><Text style={styles.heroText}>ไม่ต้องกังวล เราจะส่งลิงก์ให้ทางอีเมล</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View><View style={{ flex: 1 }}><Text style={styles.stepTitle}>กรอกอีเมลมหาวิทยาลัย</Text><Text style={styles.stepText}>ใช้อีเมล @psu.ac.th ที่สมัครสมาชิกไว้</Text></View></View>
          <Text style={styles.label}>อีเมลมหาวิทยาลัย</Text>
          <View style={[styles.inputShell, focused && styles.inputFocused]}><Ionicons name="mail-outline" size={19} color={focused ? colors.primary : colors.textSecondary} /><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="student@psu.ac.th" placeholderTextColor={colors.textSecondary} selectionColor={colors.primary} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input} /></View>
          <Pressable disabled={loading} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}>{loading ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.buttonText}>ส่งลิงก์ตั้งรหัสผ่านใหม่</Text><Ionicons name="paper-plane-outline" size={18} color={colors.white} /></>}</Pressable>
          <View style={styles.help}><View style={styles.helpIcon}><Ionicons name="information-circle-outline" size={18} color={colors.contact} /></View><Text style={styles.helpText}>หลังจากกดส่ง กรุณาตรวจสอบทั้งกล่องข้อความเข้าและจดหมายขยะ</Text></View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEF2F7' }, scroll: { flexGrow: 1, justifyContent: 'center', padding: Platform.OS === 'web' ? 20 : 0 }, frame: { width: '100%', maxWidth: Platform.OS === 'web' ? 510 : undefined, alignSelf: 'center', overflow: 'hidden', borderRadius: Platform.OS === 'web' ? 28 : 0, backgroundColor: colors.white, shadowColor: '#203354', shadowOpacity: Platform.OS === 'web' ? .14 : 0, shadowRadius: 24, elevation: 5 },
  hero: { minHeight: 260, paddingHorizontal: 21, paddingTop: 25, paddingBottom: 25, backgroundColor: colors.primary, overflow: 'hidden' }, orb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -90, right: -55, backgroundColor: 'rgba(255,255,255,.11)' }, back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.96)' }, backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, backText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' }, heroIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: 24, backgroundColor: colors.white }, heroTitle: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 11 }, heroText: { color: 'rgba(255,255,255,.87)', fontSize: 11, marginTop: 3 },
  card: { padding: 21, paddingBottom: 25, backgroundColor: colors.white }, step: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 21, borderRadius: 15, backgroundColor: colors.softOrange }, stepNumber: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, stepNumberText: { color: colors.white, fontSize: 14, fontWeight: '900' }, stepTitle: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' }, stepText: { color: '#A85A3D', fontSize: 9, marginTop: 2 },
  label: { color: colors.textPrimary, fontSize: 12, fontWeight: '900', marginBottom: 7 }, inputShell: { height: 51, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#FCFCFD' }, inputFocused: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#FFFDFC' }, input: { flex: 1, height: '100%', color: colors.textPrimary, fontSize: 13, outlineStyle: 'none' }, button: { height: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, borderRadius: 14, backgroundColor: colors.primary }, buttonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  help: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 17, padding: 11, borderWidth: 1, borderColor: colors.contactBorder, borderRadius: 14, backgroundColor: colors.contactSoft }, helpIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, helpText: { flex: 1, color: '#52736F', fontSize: 9, lineHeight: 14 }, pressed: { opacity: .84, transform: [{ scale: .98 }] }, disabled: { opacity: .6 },
});
