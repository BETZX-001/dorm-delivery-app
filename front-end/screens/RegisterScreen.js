import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { api } from '../client';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import GenderSelector from '../components/GenderSelector';
import { colors } from '../components/theme';

const UNIVERSITY_EMAIL_DOMAIN = '@psu.ac.th';
const SPECIAL_CHARACTER = /[!@#$%^&*(),.?":{}|<>_\-\\/\[\];'`~+=]/;

function passwordError(password) {
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (!/[a-z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์เล็ก';
  if (!/[A-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่';
  if (!/\d/.test(password)) return 'รหัสผ่านต้องมีตัวเลข';
  if (!SPECIAL_CHARACTER.test(password)) return 'รหัสผ่านต้องมีอักขระพิเศษ เช่น ! @ #';
  return null;
}

function SectionTitle({ number, icon, title, subtitle }) {
  return <View style={styles.sectionTitleRow}><View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View><View style={styles.sectionIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View></View>;
}

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', gender: '', password: '', confirmPassword: '', dorm_name: '', room_number: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const scrollRef = useRef(null);
  const verificationChecking = useRef(false);

  useEffect(() => {
    if (step !== 4 || verificationComplete) return undefined;
    let active = true;
    const checkVerification = async () => {
      if (verificationChecking.current) return;
      verificationChecking.current = true;
      try {
        const user = auth.currentUser;
        if (!user) return;
        await user.reload();
        if (active && auth.currentUser?.emailVerified) {
          await auth.currentUser.getIdToken(true);
          await api.post('/api/auth/password/claim', { password: form.password });
          await AsyncStorage.setItem('pendingProfile', JSON.stringify({ name: `${form.firstName.trim()} ${form.lastName.trim()}`, phone: form.phone.trim(), gender: form.gender, dorm_name: form.dorm_name.trim(), room_number: form.room_number.trim() || null }));
          setVerificationComplete(true);
          setVerificationError('');
          await signOut(auth);
          setTimeout(() => navigation.replace('Login'), 2200);
        }
      } catch (error) {
        if (!active) return;
        if (/รหัสผ่านซ้ำ/.test(error.message || '')) {
          const user = auth.currentUser;
          if (user) await deleteUser(user).catch(() => signOut(auth));
          await AsyncStorage.removeItem('pendingProfile');
          setSubmitError('รหัสผ่านซ้ำ');
          goToStep(2, false);
        } else setVerificationError('ยังตรวจสอบสถานะไม่ได้ ระบบจะลองใหม่ให้อัตโนมัติ');
      } finally { verificationChecking.current = false; }
    };
    checkVerification();
    const timer = setInterval(checkVerification, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [step, verificationComplete, navigation]);

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }
  function validate(targetStep = null) {
    const next = {};
    if (!targetStep || targetStep === 1) {
      if (!form.firstName.trim()) next.firstName = 'กรุณากรอกชื่อ';
      if (!form.lastName.trim()) next.lastName = 'กรุณากรอกนามสกุล';
      if (!form.email.trim()) next.email = 'กรุณากรอกอีเมลมหาวิทยาลัย';
      else if (!form.email.trim().toLowerCase().endsWith(UNIVERSITY_EMAIL_DOMAIN)) next.email = `กรุณาใช้อีเมลที่ลงท้ายด้วย ${UNIVERSITY_EMAIL_DOMAIN}`;
      if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์โทรศัพท์';
      else if (!/^0\d{8,9}$/.test(form.phone.replace(/[\s-]/g, ''))) next.phone = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง';
      if (!form.gender) next.gender = 'กรุณาเลือกเพศ';
    }
    if (!targetStep || targetStep === 2) {
      const passError = passwordError(form.password);
      if (passError) next.password = passError;
      if (!form.confirmPassword) next.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
      else if (form.password !== form.confirmPassword) next.confirmPassword = 'รหัสผ่านยืนยันไม่ตรงกัน';
    }
    if ((!targetStep || targetStep === 3) && !form.dorm_name.trim()) next.dorm_name = 'กรุณากรอกชื่อหอพัก';
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function goToStep(nextStep, clearErrors = true) {
    setStep(nextStep);
    if (clearErrors) setErrors({});
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  }
  async function continueNext() {
    if (!validate(step)) return;
    if (step !== 2) return goToStep(step + 1);
    setLoading(true);
    try {
      await api.postPublic('/api/auth/password/check', { password: form.password });
      goToStep(3);
    } catch (error) {
      setErrors((current) => ({ ...current, password: /รหัสผ่านซ้ำ/.test(error.message || '') ? 'รหัสผ่านซ้ำ' : error.message || 'ตรวจสอบรหัสผ่านไม่สำเร็จ' }));
    } finally { setLoading(false); }
  }
  async function handleRegister() {
    if (loading) return;
    setSubmitError('');
    if (!validate(1)) return goToStep(1, false);
    if (!validate(2)) return goToStep(2, false);
    if (!validate(3)) return goToStep(3, false);
    setLoading(true);
    try {
      await api.postPublic('/api/auth/password/check', { password: form.password });
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await sendEmailVerification(credential.user);
      goToStep(4);
    } catch (error) {
      const message = /รหัสผ่านซ้ำ/.test(error.message || '') ? 'รหัสผ่านซ้ำ' : mapAuthError(error.code, error.message);
      if (/รหัสผ่านซ้ำ/.test(message)) goToStep(2, false);
      setSubmitError(message);
      Alert.alert('สมัครสมาชิกไม่สำเร็จ', message);
    }
    finally { setLoading(false); }
  }

  async function resendVerification() {
    if (!auth.currentUser || loading) return;
    setLoading(true);
    setVerificationError('');
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('ส่งอีเมลอีกครั้งแล้ว', `กรุณาตรวจสอบกล่องจดหมายของ ${form.email.trim()}`);
    } catch (error) {
      setVerificationError(error.code === 'auth/too-many-requests' ? 'ส่งอีเมลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' : 'ส่งอีเมลยืนยันไม่สำเร็จ กรุณาลองใหม่');
    } finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.frame}>
        <View style={styles.hero}>
          <View style={styles.orb} />
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.primaryDark} /></View><Text style={styles.backText}>กลับหน้าเข้าสู่ระบบ</Text></Pressable>
          <View style={styles.heroTitleRow}><View style={styles.heroIcon}><Ionicons name="person-add-outline" size={25} color={colors.primary} /></View><View><Text style={styles.heroTitle}>สร้างบัญชี Hiu</Text><Text style={styles.heroSubtitle}>สมัครครั้งเดียว ใช้ได้ทั้งฝากซื้อและรับหิ้ว</Text></View></View>
        </View>

        <View style={styles.body}>
          <View style={styles.progress}>{[['ข้อมูลส่วนตัว', 1], ['รหัสผ่าน', 2], ['ข้อมูลที่พัก', 3], ['ยืนยันอีเมล', 4]].map(([label, number], index) => <React.Fragment key={number}>{index > 0 && <View style={[styles.progressLine, step >= number && styles.progressLineActive]} />}<View style={styles.progressItem}><View style={step >= number ? styles.progressDotActive : styles.progressDot}><Text style={step >= number ? styles.progressDotText : styles.progressDotMuted}>{step > number ? '✓' : number}</Text></View><Text style={step >= number ? styles.progressTextActive : styles.progressText}>{label}</Text></View></React.Fragment>)}</View>

          {step === 1 && <View style={styles.card}>
            <SectionTitle number="1" icon="person-outline" title="ข้อมูลส่วนตัว" subtitle="ข้อมูลสำหรับแสดงในออเดอร์" />
            <View style={styles.twoColumns}><View style={styles.column}><FormInput label="ชื่อ" placeholder="สมชาย" value={form.firstName} onChangeText={(value) => update('firstName', value)} error={errors.firstName} /></View><View style={styles.column}><FormInput label="นามสกุล" placeholder="ใจดี" value={form.lastName} onChangeText={(value) => update('lastName', value)} error={errors.lastName} /></View></View>
            <FormInput label="อีเมลมหาวิทยาลัย" placeholder="student@psu.ac.th" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={form.email} onChangeText={(value) => update('email', value)} error={errors.email} />
            <FormInput label="เบอร์โทรศัพท์" placeholder="08x-xxx-xxxx" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => update('phone', value)} error={errors.phone} />
            <GenderSelector value={form.gender} onChange={(value) => update('gender', value)} error={errors.gender} />
          </View>}

          {step === 2 && <View style={styles.card}>
            <SectionTitle number="2" icon="shield-checkmark-outline" title="ตั้งรหัสผ่าน" subtitle="ใช้สำหรับเข้าสู่ระบบอย่างปลอดภัย" />
            <FormInput label="รหัสผ่าน" placeholder="อย่างน้อย 8 ตัวอักษร" secureTextEntry value={form.password} onChangeText={(value) => update('password', value)} error={errors.password} />
            <FormInput label="ยืนยันรหัสผ่าน" placeholder="กรอกรหัสผ่านอีกครั้ง" secureTextEntry value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} error={errors.confirmPassword} />
            <View style={styles.passwordHelp}><Ionicons name="information-circle-outline" size={17} color={colors.contact} /><Text style={styles.passwordHelpText}>ต้องมีตัวพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ เช่น ! @ #</Text></View>
          </View>}

          {step === 3 && <View style={styles.card}>
            <SectionTitle number="3" icon="business-outline" title="ข้อมูลที่พัก" subtitle="ช่วยให้รับและส่งของได้ถูกห้อง" />
            <FormInput label="ชื่อหอพัก" placeholder="เช่น หอพัก A" value={form.dorm_name} onChangeText={(value) => update('dorm_name', value)} error={errors.dorm_name} />
            <FormInput label="เลขห้อง (ไม่บังคับ)" placeholder="เช่น 305" value={form.room_number} onChangeText={(value) => update('room_number', value)} />
          </View>}

          {step === 3 && <View style={styles.termsBox}><Ionicons name="document-text-outline" size={18} color={colors.primary} /><Text style={styles.terms}>เมื่อสมัครสมาชิก แสดงว่าคุณยอมรับ <Text style={styles.termsLink}>ข้อกำหนดการใช้งาน</Text> และ <Text style={styles.termsLink}>นโยบายความเป็นส่วนตัว</Text></Text></View>}
          {step === 4 && <View style={styles.verificationCard}>
            <View style={[styles.verificationIcon, verificationComplete && styles.successIcon]}><Ionicons name={verificationComplete ? 'checkmark' : 'mail-unread-outline'} size={34} color={verificationComplete ? colors.white : colors.primary} /></View>
            <Text style={styles.verificationTitle}>{verificationComplete ? 'สมัครสมาชิกเรียบร้อยแล้ว' : 'ยืนยันอีเมลของคุณ'}</Text>
            <Text style={styles.verificationText}>{verificationComplete ? 'บัญชีของคุณพร้อมใช้งานแล้ว กำลังพาไปยังหน้าเข้าสู่ระบบ' : `เราได้ส่งลิงก์ยืนยันไปที่\n${form.email.trim()}\nกรุณากดลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี`}</Text>
            {!verificationComplete && <><View style={styles.checkingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.checkingText}>กำลังรอการยืนยันและตรวจสอบอัตโนมัติ...</Text></View><Pressable disabled={loading} onPress={resendVerification} style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}><Text style={styles.resendText}>{loading ? 'กำลังส่ง...' : 'ส่งอีเมลยืนยันอีกครั้ง'}</Text></Pressable></>}
            {!!verificationError && <Text style={styles.verificationError}>{verificationError}</Text>}
          </View>}
          {step < 4 && !!submitError && <View style={styles.submitError}><Ionicons name="alert-circle-outline" size={17} color="#E83F5B" /><Text style={styles.submitErrorText}>{submitError}</Text></View>}
          {step < 4 && <View style={styles.stepActions}>{step > 1 && <Pressable disabled={loading} onPress={() => goToStep(step - 1)} style={({ pressed }) => [styles.previousButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={17} color={colors.primary} /><Text style={styles.previousText}>ย้อนกลับ</Text></Pressable>}<View style={{ flex: 1 }}><PrimaryButton label={step < 3 ? 'ถัดไป' : 'สร้างบัญชีและยืนยันอีเมล'} onPress={step < 3 ? continueNext : handleRegister} loading={loading} /></View></View>}
          {step < 4 && <View style={styles.loginRow}><Text style={styles.loginText}>มีบัญชีอยู่แล้ว?</Text><Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.loginLink}>เข้าสู่ระบบ</Text></Pressable></View>}
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function mapAuthError(code, fallbackMessage = '') {
  if (code === 'auth/email-already-in-use') return 'อีเมลนี้ถูกสมัครใช้งานแล้ว';
  if (code === 'auth/invalid-email') return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (code === 'auth/weak-password') return 'รหัสผ่านไม่ปลอดภัยเพียงพอ';
  if (/network|fetch|timeout|server|เซิร์ฟเวอร์/i.test(fallbackMessage)) return 'เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบว่า backend เปิดอยู่แล้วลองใหม่';
  return fallbackMessage || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEF2F7' }, scroll: { flexGrow: 1, paddingHorizontal: Platform.OS === 'web' ? 20 : 0, paddingVertical: Platform.OS === 'web' ? 28 : 0 }, frame: { width: '100%', maxWidth: Platform.OS === 'web' ? 620 : undefined, alignSelf: 'center', overflow: 'hidden', borderRadius: Platform.OS === 'web' ? 28 : 0, backgroundColor: colors.background, shadowColor: '#203354', shadowOpacity: Platform.OS === 'web' ? .13 : 0, shadowRadius: 25 },
  hero: { minHeight: 205, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 24, backgroundColor: colors.primary, overflow: 'hidden' }, orb: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -92, right: -50, backgroundColor: 'rgba(255,255,255,.11)' }, back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.96)' }, backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, backText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' }, heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 }, heroIcon: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900' }, heroSubtitle: { color: 'rgba(255,255,255,.87)', fontSize: 11, marginTop: 3 },
  body: { padding: 16, gap: 14 }, progress: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 17, backgroundColor: colors.white }, progressItem: { width: 72, alignItems: 'center' }, progressDotActive: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, progressDot: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }, progressDotText: { color: colors.white, fontSize: 11, fontWeight: '900' }, progressDotMuted: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' }, progressLine: { flex: 1, height: 2, marginTop: 13, backgroundColor: colors.border }, progressLineActive: { backgroundColor: colors.primary }, progressTextActive: { color: colors.primary, fontSize: 9, fontWeight: '900', marginTop: 4, textAlign: 'center' }, progressText: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  card: { padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.white }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 13, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, sectionNumber: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, sectionNumberText: { color: colors.white, fontSize: 11, fontWeight: '900' }, sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, sectionSubtitle: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, twoColumns: { flexDirection: 'row', gap: 10 }, column: { flex: 1 },
  passwordHelp: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderWidth: 1, borderColor: colors.contactBorder, borderRadius: 13, backgroundColor: colors.contactSoft }, passwordHelpText: { flex: 1, color: '#52736F', fontSize: 9, lineHeight: 14 }, termsBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.softOrange }, terms: { flex: 1, color: colors.textSecondary, fontSize: 10, lineHeight: 16 }, termsLink: { color: colors.primary, fontWeight: '900' }, stepActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, previousButton: { minWidth: 112, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 13, borderWidth: 1, borderColor: '#FFC8B2', borderRadius: 14, backgroundColor: colors.softOrange }, previousText: { color: colors.primary, fontSize: 12, fontWeight: '900' }, loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginVertical: 4 }, loginText: { color: colors.textSecondary, fontSize: 12 }, loginLink: { color: colors.primary, fontSize: 12, fontWeight: '900' }, pressed: { opacity: .82, transform: [{ scale: .98 }] },
  submitError: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 11, borderWidth: 1, borderColor: '#FFB8C2', borderRadius: 13, backgroundColor: '#FFF1F3' }, submitErrorText: { flex: 1, color: '#E83F5B', fontSize: 11, fontWeight: '700' },
  verificationCard: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 30, borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.white }, verificationIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, successIcon: { backgroundColor: '#08B963' }, verificationTitle: { marginTop: 17, color: colors.textPrimary, fontSize: 20, fontWeight: '900', textAlign: 'center' }, verificationText: { marginTop: 9, color: colors.textSecondary, fontSize: 12, lineHeight: 20, textAlign: 'center' }, checkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.softOrange }, checkingText: { color: colors.primaryDark, fontSize: 10, fontWeight: '700' }, resendButton: { marginTop: 15, paddingHorizontal: 17, paddingVertical: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 999 }, resendText: { color: colors.primary, fontSize: 11, fontWeight: '900' }, verificationError: { marginTop: 12, color: '#E83F5B', fontSize: 10, textAlign: 'center' },
});
