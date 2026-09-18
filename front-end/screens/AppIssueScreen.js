import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import ProfilePageHeader from '../components/ProfilePageHeader';
import { colors, spacing } from '../components/theme';

const TYPES = [
  ['เปิดใช้งานไม่ได้', 'power-outline'],
  ['ข้อมูลไม่อัปเดต', 'refresh-outline'],
  ['หน้าจอแสดงผลผิดปกติ', 'phone-portrait-outline'],
  ['ข้อเสนอแนะ', 'bulb-outline'],
  ['อื่น ๆ', 'ellipsis-horizontal'],
];

export default function AppIssueScreen({ navigation }) {
  const { activeRole } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const dark = runner ? colors.runnerDark : colors.primaryDark;
  const soft = runner ? colors.softGreen : colors.softOrange;
  const [type, setType] = useState(TYPES[0][0]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function submit() {
    if (!detail.trim()) { setError('กรุณาอธิบายปัญหาที่พบ'); return; }
    setSending(true);
    try {
      await api.post('/api/reports', { category: 'OTHER', description: `[ปัญหาแอป: ${type}] ${detail.trim()}` });
      setResult({ success: true, message: 'ขอบคุณที่ช่วยแจ้งปัญหา ทีมงานจะตรวจสอบโดยเร็ว' });
    } catch (e) { setResult({ success: false, message: e.message }); }
    finally { setSending(false); }
  }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <ProfilePageHeader navigation={navigation} icon="bug-outline" title="รายงานปัญหาแอป" subtitle="แจ้งสิ่งที่พบเพื่อช่วยให้ Hiu ใช้งานได้ดียิ่งขึ้น" />
      <View style={styles.body}>
        <View style={[styles.context, { backgroundColor: soft, borderColor: accent }]}><View style={styles.contextIcon}><Ionicons name={runner ? 'bicycle-outline' : 'bag-handle-outline'} size={18} color={accent} /></View><View style={{ flex: 1 }}><Text style={[styles.contextTitle, { color: dark }]}>กำลังรายงานจากโหมด {runner ? 'Runner' : 'Requester'}</Text><Text style={styles.contextText}>ข้อมูลโหมดและบัญชีจะถูกแนบเพื่อช่วยตรวจสอบ</Text></View></View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}><View style={[styles.number, { backgroundColor: soft }]}><Text style={[styles.numberText, { color: accent }]}>1</Text></View><View><Text style={styles.sectionTitle}>คุณพบปัญหาแบบไหน?</Text><Text style={styles.sectionHint}>เลือกหนึ่งหัวข้อที่ตรงที่สุด</Text></View></View>
          <View style={styles.types}>{TYPES.map(([label, icon]) => {
            const active = type === label;
            return <Pressable key={label} onPress={() => setType(label)} style={({ pressed }) => [styles.type, active && { borderColor: accent, backgroundColor: soft }, pressed && styles.pressed]}><View style={[styles.typeIcon, active && { backgroundColor: accent }]}><Ionicons name={icon} size={18} color={active ? colors.white : accent} /></View><Text style={[styles.typeText, active && { color: dark }]}>{label}</Text><View style={[styles.radio, active && { borderColor: accent, backgroundColor: accent }]}>{active ? <Ionicons name="checkmark" size={11} color={colors.white} /> : null}</View></Pressable>;
          })}</View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}><View style={[styles.number, { backgroundColor: soft }]}><Text style={[styles.numberText, { color: accent }]}>2</Text></View><View><Text style={styles.sectionTitle}>รายละเอียดปัญหา</Text><Text style={styles.sectionHint}>ระบุหน้าจอและสิ่งที่เกิดขึ้นให้ชัดเจน</Text></View></View>
          <TextInput value={detail} onChangeText={(value) => { setDetail(value); setError(''); }} multiline maxLength={500} placeholder="เช่น กดปุ่มแล้วไม่มีการตอบสนอง หรือหน้าจอแสดงผลผิดปกติ..." placeholderTextColor={colors.textSecondary} style={styles.detail} textAlignVertical="top" />
          <Text style={styles.counter}>{detail.length}/500</Text>
          {error ? <View style={styles.errorRow}><Ionicons name="alert-circle-outline" size={15} color={colors.danger} /><Text style={styles.error}>{error}</Text></View> : null}
        </View>

        <View style={styles.privacy}><View style={styles.privacyIcon}><Ionicons name="shield-checkmark-outline" size={18} color={colors.contact} /></View><View style={{ flex: 1 }}><Text style={styles.privacyTitle}>ส่งข้อมูลอย่างปลอดภัย</Text><Text style={styles.privacyText}>ทีมงานจะใช้ข้อมูลนี้เพื่อตรวจสอบและปรับปรุงระบบเท่านั้น</Text></View></View>
      </View>
    </ScrollView>
    <View style={styles.footer}><PrimaryButton tone={runner ? 'runner' : 'requester'} label="ส่งรายงานให้ทีมงาน" onPress={submit} loading={sending} /></View>

    <Modal visible={!!result} transparent animationType="fade"><View style={styles.shade}><View style={styles.resultCard}><View style={[styles.resultIcon, { backgroundColor: result?.success ? soft : '#FFF0F2' }]}><Ionicons name={result?.success ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={31} color={result?.success ? accent : colors.danger} /></View><Text style={styles.resultTitle}>{result?.success ? 'ส่งรายงานแล้ว' : 'ส่งรายงานไม่สำเร็จ'}</Text><Text style={styles.resultText}>{result?.message}</Text><Pressable onPress={() => result?.success ? navigation.goBack() : setResult(null)} style={[styles.resultButton, { backgroundColor: result?.success ? accent : colors.danger }]}><Text style={styles.resultButtonText}>{result?.success ? 'กลับหน้าโปรไฟล์' : 'ลองใหม่'}</Text></Pressable></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, scroll: { paddingBottom: 104 }, body: { padding: spacing.md, gap: 14 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 16 }, contextIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, contextTitle: { fontSize: 12, fontWeight: '900' }, contextText: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  card: { padding: 15, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 }, number: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, numberText: { fontSize: 15, fontWeight: '900' }, sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, sectionHint: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  types: { gap: 8 }, type: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#FCFCFD' }, typeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, typeText: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '800' }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  detail: { minHeight: 130, padding: 13, paddingBottom: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FCFCFD', color: colors.textPrimary, fontSize: 13, lineHeight: 19, outlineStyle: 'none' }, counter: { alignSelf: 'flex-end', color: colors.textSecondary, fontSize: 10, marginTop: -21, marginRight: 10, marginBottom: 7 }, errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }, error: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.contactBorder, backgroundColor: colors.contactSoft }, privacyIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, privacyTitle: { color: colors.contactDark, fontSize: 12, fontWeight: '900' }, privacyText: { color: '#52736F', fontSize: 10, lineHeight: 15, marginTop: 2 },
  footer: { padding: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, pressed: { opacity: .8, transform: [{ scale: .985 }] },
  shade: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(15,23,42,.48)' }, resultCard: { width: '100%', maxWidth: 390, alignItems: 'center', padding: 22, borderRadius: 22, backgroundColor: colors.surface }, resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, resultTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 19, marginTop: 11 }, resultText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 19 }, resultButton: { minWidth: 160, alignItems: 'center', borderRadius: 12, marginTop: 20, paddingVertical: 12, paddingHorizontal: 20 }, resultButtonText: { color: colors.white, fontWeight: '900' },
});
