import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { colors } from '../components/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const appConfig = Constants.expoConfig?.extra || {};
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: appConfig.googleWebClientId,
    androidClientId: appConfig.googleAndroidClientId,
    selectAccount: true,
  });

  useEffect(() => {
    async function finishGoogleLogin() {
      if (googleResponse?.type !== 'success') {
        if (googleResponse?.type === 'error') Alert.alert('เข้าสู่ระบบ Google ไม่สำเร็จ', 'กรุณาลองใหม่ หรือตรวจสอบการตั้งค่า Google Sign-In');
        setGoogleLoading(false); return;
      }
      const idToken = googleResponse.params?.id_token;
      if (!idToken) { setGoogleLoading(false); Alert.alert('เข้าสู่ระบบ Google ไม่สำเร็จ', 'ไม่ได้รับข้อมูลยืนยันตัวตนจาก Google'); return; }
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        if (!(result.user.email?.toLowerCase() || '').endsWith('@psu.ac.th')) {
          await signOut(auth);
          Alert.alert('ใช้ได้เฉพาะบัญชี PSU', 'กรุณาเลือกอีเมลมหาวิทยาลัยที่ลงท้ายด้วย @psu.ac.th');
        }
      } catch (error) {
        console.log('Google PSU sign-in failed:', error.message);
        Alert.alert('เข้าสู่ระบบ Google ไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      } finally { setGoogleLoading(false); }
    }
    finishGoogleLogin();
  }, [googleResponse]);

  async function login() {
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors = {};
    if (!normalizedEmail) nextErrors.email = 'กรุณากรอกอีเมลมหาวิทยาลัย';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) nextErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    else if (!normalizedEmail.endsWith('@psu.ac.th')) nextErrors.email = 'กรุณาใช้อีเมลที่ลงท้ายด้วย @psu.ac.th';
    if (!password) nextErrors.password = 'กรุณากรอกรหัสผ่าน';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setLoginError('');
      return;
    }

    setErrors({});
    setLoginError('');
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await credential.user.reload();
      const user = auth.currentUser;
      if (!user?.emailVerified) {
        await signOut(auth);
        setLoginError('บัญชีนี้ยังสมัครไม่เสร็จ กรุณากลับไปยืนยันอีเมลจากขั้นตอนสมัครสมาชิก');
        return;
      }
      await user.getIdToken(true);
    } catch (error) {
      if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'รูปแบบอีเมลไม่ถูกต้อง' });
      } else if (error.code === 'auth/user-not-found') {
        setErrors({ email: 'ไม่พบบัญชีที่ใช้อีเมลนี้' });
      } else if (error.code === 'auth/wrong-password') {
        setErrors({ password: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
      } else if (error.code === 'auth/invalid-credential') {
        // Newer Firebase versions intentionally combine unknown-email and
        // wrong-password into one code, so highlight both related fields.
        setErrors({
          email: 'กรุณาตรวจสอบอีเมลที่ใช้เข้าสู่ระบบ',
          password: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        });
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่');
      } else if (error.code === 'auth/network-request-failed') {
        setLoginError('เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
      } else {
        setLoginError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } finally { setLoading(false); }
  }

  async function loginWithGooglePsu() {
    if (!googleRequest) return Alert.alert('กำลังเตรียม Google Sign-In', 'กรุณารอสักครู่แล้วกดอีกครั้ง');
    setGoogleLoading(true);
    try { await promptGoogle(); }
    catch { setGoogleLoading(false); Alert.alert('เปิด Google ไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง'); }
  }

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={styles.frame}>
        <View style={styles.hero}>
          <View style={styles.orbOne} /><View style={styles.orbTwo} />
          <View style={styles.logoTile}><Image source={require('../assets/hiu-logo.png')} style={styles.logo} resizeMode="contain" /></View>
          <Text style={styles.brand}>Hiu</Text><Text style={styles.tagline}>หิ้วของให้กัน ง่าย ๆ ในหอพัก</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.welcomeIcon}><Ionicons name="hand-left-outline" size={20} color={colors.primary} /></View>
          <Text style={styles.title}>ยินดีต้อนรับกลับมา</Text><Text style={styles.subtitle}>เข้าสู่ระบบเพื่อฝากซื้อหรือเริ่มรับหิ้ว</Text>

          <Text style={styles.label}>อีเมลมหาวิทยาลัย</Text>
          <View style={[styles.inputShell, errors.email && styles.inputShellError, focusedField === 'email' && !errors.email && styles.inputShellFocused, errors.email && styles.inputShellWithFeedback]}>
            <View style={styles.fieldIcon}><Ionicons name="mail-outline" size={19} color={errors.email ? colors.danger : focusedField === 'email' ? colors.primary : colors.textSecondary} /></View>
            <TextInput style={styles.input} value={email} onChangeText={(value) => { setEmail(value); setErrors((old) => ({ ...old, email: undefined, password: undefined })); setLoginError(''); }} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="student@psu.ac.th" placeholderTextColor={colors.textSecondary} />
          </View>
          {!!errors.email && <View style={styles.fieldErrorRow}><Ionicons name="alert-circle" size={14} color={colors.danger} /><Text style={styles.fieldError}>{errors.email}</Text></View>}
          <Text style={styles.label}>รหัสผ่าน</Text>
          <View style={[styles.inputShell, errors.password && styles.inputShellError, focusedField === 'password' && !errors.password && styles.inputShellFocused, errors.password && styles.inputShellWithFeedback]}>
            <View style={styles.fieldIcon}><Ionicons name="lock-closed-outline" size={19} color={errors.password ? colors.danger : focusedField === 'password' ? colors.primary : colors.textSecondary} /></View>
            <TextInput style={[styles.input, styles.passwordInput]} value={password} onChangeText={(value) => { setPassword(value); setErrors((old) => ({ ...old, password: undefined })); setLoginError(''); }} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} secureTextEntry={!passwordVisible} placeholder="กรุณากรอกรหัสผ่าน" placeholderTextColor={colors.textSecondary} />
            <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onPress={() => setPasswordVisible((value) => !value)} style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}><Ionicons name={passwordVisible ? 'eye-outline' : 'eye-off-outline'} size={21} color={passwordVisible ? colors.primary : colors.textSecondary} /></Pressable>
          </View>
          {!!errors.password && <View style={styles.fieldErrorRow}><Ionicons name="alert-circle" size={14} color={colors.danger} /><Text style={styles.fieldError}>{errors.password}</Text></View>}
          <Pressable onPress={() => navigation.navigate('ForgotPassword', { email })} style={({ pressed }) => [styles.forgotButton, pressed && styles.textPressed]}><Text style={styles.forgot}>ลืมรหัสผ่าน?</Text></Pressable>

          {!!loginError && <View style={styles.loginErrorBox}><Ionicons name="warning-outline" size={18} color={colors.danger} /><Text style={styles.loginErrorText}>{loginError}</Text></View>}

          <Pressable disabled={loading} onPress={login} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed, loading && styles.disabled]}>{loading ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.loginText}>เข้าสู่ระบบ</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></>}</Pressable>
          <View style={styles.registerRow}><Text style={styles.registerText}>ยังไม่มีบัญชี?</Text><Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.registerLink}>สมัครสมาชิก</Text></Pressable></View>

          <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>หรือเข้าสู่ระบบด้วย</Text><View style={styles.line} /></View>
          <Pressable disabled={googleLoading} onPress={loginWithGooglePsu} style={({ pressed }) => [styles.universityButton, pressed && styles.pressed, googleLoading && styles.disabled]}>
            <View style={styles.googleIcon}><Ionicons name="school-outline" size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={styles.universityText}>{googleLoading ? 'กำลังเปิด Google...' : 'Google PSU'}</Text><Text style={styles.universityHint}>สำหรับอีเมลมหาวิทยาลัย @psu.ac.th</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.secure}><Ionicons name="shield-checkmark-outline" size={14} color={colors.contact} /><Text style={styles.secureText}>ข้อมูลการเข้าสู่ระบบได้รับการปกป้องอย่างปลอดภัย</Text></View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEF2F7' }, scroll: { flexGrow: 1, justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start', paddingHorizontal: Platform.OS === 'web' ? 20 : 0, paddingVertical: Platform.OS === 'web' ? 28 : 0 },
  frame: { width: '100%', maxWidth: Platform.OS === 'web' ? 510 : undefined, minHeight: Platform.OS === 'web' ? 760 : '100%', alignSelf: 'center', overflow: 'hidden', borderRadius: Platform.OS === 'web' ? 28 : 0, backgroundColor: colors.white, shadowColor: '#203354', shadowOpacity: Platform.OS === 'web' ? .14 : 0, shadowRadius: 26, shadowOffset: { width: 0, height: 12 } },
  hero: { minHeight: 220, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 29, backgroundColor: colors.primary, overflow: 'hidden' }, orbOne: { position: 'absolute', width: 195, height: 195, borderRadius: 98, top: -102, right: -48, backgroundColor: 'rgba(255,255,255,.11)' }, orbTwo: { position: 'absolute', width: 125, height: 125, borderRadius: 63, bottom: -70, left: -32, backgroundColor: 'rgba(126,39,7,.11)' },
  logoTile: { width: 64, height: 64, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, shadowColor: '#98310C', shadowOpacity: .2, shadowRadius: 8, elevation: 4 }, logo: { width: 54, height: 54 }, brand: { color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: '900', marginTop: 7 }, tagline: { color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  card: { flex: 1, marginTop: -1, paddingHorizontal: 22, paddingTop: 23, paddingBottom: 27, borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: colors.white }, welcomeIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, title: { color: colors.textPrimary, fontSize: 23, fontWeight: '900', marginTop: 9 }, subtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 3, marginBottom: 20 },
  label: { color: colors.textPrimary, fontSize: 12, fontWeight: '900', marginBottom: 7 }, inputShell: { height: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginBottom: 15, backgroundColor: '#FCFCFD' }, inputShellFocused: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#FFFDFC' }, inputShellError: { borderWidth: 1.5, borderColor: colors.danger, backgroundColor: '#FFF8F8' }, inputShellWithFeedback: { marginBottom: 0 }, fieldIcon: { width: 43, alignItems: 'center' }, input: { flex: 1, height: '100%', paddingRight: 13, color: colors.textPrimary, fontSize: 13, outlineStyle: 'none' }, passwordInput: { paddingRight: 48 }, eyeButton: { position: 'absolute', right: 4, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, marginBottom: 13, paddingHorizontal: 3 }, fieldError: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 16, fontWeight: '700' }, loginErrorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 12, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: '#FFD4DA', backgroundColor: '#FFF0F2' }, loginErrorText: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  forgotButton: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 19 }, forgot: { color: colors.primary, fontSize: 12, fontWeight: '900' }, loginButton: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, backgroundColor: colors.primary, shadowColor: '#B84924', shadowOpacity: .2, shadowRadius: 7, elevation: 4 }, loginText: { color: colors.white, fontSize: 15, fontWeight: '900' }, registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 17 }, registerText: { color: colors.textSecondary, fontSize: 12 }, registerLink: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 11, marginVertical: 20 }, line: { flex: 1, height: 1, backgroundColor: colors.border }, or: { color: colors.textSecondary, fontSize: 10 }, universityButton: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: '#FCFCFD' }, googleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, universityText: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' }, universityHint: { color: colors.textSecondary, fontSize: 9, marginTop: 3 }, secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 15 }, secureText: { color: colors.textSecondary, fontSize: 9 },
  pressed: { opacity: .84, transform: [{ scale: .98 }] }, textPressed: { opacity: .65 }, disabled: { opacity: .6 },
});
