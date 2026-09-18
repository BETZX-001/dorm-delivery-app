import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../client';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing } from '../components/theme';

const CATEGORIES = [
  { value: 'LATE_DELIVERY', label: 'ส่งล่าช้า', hint: 'ได้รับของช้ากว่าเวลาที่แจ้ง', icon: 'time-outline' },
  { value: 'ITEM_ISSUE', label: 'ปัญหาสินค้า', hint: 'สินค้าไม่ครบหรือไม่ถูกต้อง', icon: 'cube-outline' },
  { value: 'PAYMENT_DISPUTE', label: 'ปัญหาค่าใช้จ่าย', hint: 'ยอดเงินหรือค่าหิ้วไม่ตรง', icon: 'wallet-outline' },
  { value: 'BEHAVIOR', label: 'พฤติกรรมไม่เหมาะสม', hint: 'การสื่อสารหรือการให้บริการ', icon: 'person-outline' },
  { value: 'OTHER', label: 'ปัญหาอื่น ๆ', hint: 'เรื่องอื่นที่ไม่มีในตัวเลือก', icon: 'ellipsis-horizontal' },
];

export default function ReportScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.order_id || null;
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  function handleSubmit() {
    if (!category) { setError('กรุณาเลือกประเภทปัญหา'); return; }
    if (!description.trim()) { setError('กรุณาระบุรายละเอียดปัญหา'); return; }
    setError(null); setConfirming(true);
  }
  async function confirmSubmit() {
    setSubmitting(true);
    try {
      await api.post('/api/reports', { order_id: orderId, category, description: description.trim() });
      setConfirming(false); setResult({ success: true, message: 'ขอบคุณที่แจ้งให้เราทราบ ทีมงานจะตรวจสอบโดยเร็ว' });
    } catch (err) {
      setConfirming(false); setResult({ success: false, message: err.message || 'กรุณาลองใหม่อีกครั้ง' });
    } finally { setSubmitting(false); }
  }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.primaryDark} /></View><Text style={styles.backText}>กลับหน้าออเดอร์</Text></Pressable>
        <View style={styles.heroRow}><View style={styles.heroIcon}><Ionicons name="flag-outline" size={25} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.heroTitle}>แจ้งปัญหา</Text><Text style={styles.heroSubtitle}>บอกรายละเอียดเพื่อให้ทีมงานช่วยเหลือได้เร็วขึ้น</Text></View></View>
        {orderId ? <View style={styles.orderRef}><Ionicons name="receipt-outline" size={14} color={colors.white} /><Text style={styles.orderRefText}>เกี่ยวกับออเดอร์ #{orderId}</Text></View> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.categoryCard}>
          <View style={styles.sectionHeading}><View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>1</Text></View><View><Text style={styles.sectionTitle}>เลือกประเภทปัญหา</Text><Text style={styles.sectionSubtitle}>แตะหัวข้อที่ใกล้เคียงที่สุด</Text></View></View>
          <View style={styles.categoryGrid}>{CATEGORIES.map((item) => { const active = category === item.value; return <Pressable key={item.value} onPress={() => { setCategory(item.value); setError(null); }} style={({ pressed }) => [styles.category, item.value === 'OTHER' && styles.categoryWide, active && styles.categoryActive, pressed && styles.pressed]}>
            <View style={[styles.categoryIcon, active && styles.categoryIconActive]}><Ionicons name={item.icon} size={19} color={active ? colors.white : colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{item.label}</Text><Text style={[styles.categoryHint, active && styles.categoryHintActive]}>{item.hint}</Text></View>
            <View style={[styles.radio, active && styles.radioActive]}>{active ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}</View>
          </Pressable>; })}</View>
        </View>

        <View style={styles.descriptionCard}>
          <View style={styles.sectionHeading}><View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>2</Text></View><View><Text style={styles.sectionTitle}>เล่ารายละเอียดที่เกิดขึ้น</Text><Text style={styles.sectionSubtitle}>ยิ่งชัดเจน ทีมงานยิ่งช่วยได้เร็ว</Text></View></View>
          <TextInput value={description} onChangeText={(text) => { setDescription(text); setError(null); }} multiline maxLength={500} placeholder="เช่น ได้รับสินค้าไม่ครบ 1 รายการ และได้ติดต่อผู้รับหิ้วแล้ว..." placeholderTextColor={colors.textSecondary} style={styles.descriptionInput} textAlignVertical="top" />
          <Text style={styles.counter}>{description.length}/500</Text>
          {error ? <View style={styles.errorRow}><Ionicons name="alert-circle-outline" size={16} color={colors.danger} /><Text style={styles.error}>{error}</Text></View> : null}
        </View>

        <View style={styles.tip}><View style={styles.tipIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.contact} /></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>ข้อมูลของคุณเป็นความลับ</Text><Text style={styles.tipText}>รายละเอียดจะถูกส่งให้ทีมงานที่เกี่ยวข้องตรวจสอบเท่านั้น</Text></View></View>
      </View>
    </ScrollView>

    <View style={styles.footer}><PrimaryButton label="ส่งเรื่องให้ทีมงานตรวจสอบ" onPress={handleSubmit} loading={submitting} /></View>
    <Modal visible={confirming || !!result} transparent animationType="fade" onRequestClose={() => !submitting && (result ? setResult(null) : setConfirming(false))}>
      <View style={styles.modalShade}><View style={styles.modalCard}>
        <View style={[styles.modalIcon, result && !result.success && styles.modalIconError]}><Ionicons name={result ? (result.success ? 'checkmark-circle-outline' : 'alert-circle-outline') : 'shield-checkmark-outline'} size={30} color={result && !result.success ? colors.danger : colors.primary} /></View>
        <Text style={styles.modalTitle}>{result ? (result.success ? 'ส่งเรื่องสำเร็จ' : 'ส่งเรื่องไม่สำเร็จ') : 'ยืนยันการส่งเรื่อง?'}</Text>
        <Text style={styles.modalMessage}>{result ? result.message : 'ทีมงานจะได้รับรายละเอียดนี้เพื่อเริ่มตรวจสอบ'}</Text>
        {result ? <Pressable onPress={() => result.success ? navigation.goBack() : setResult(null)} style={styles.modalConfirm}><Text style={styles.modalConfirmText}>{result.success ? 'กลับหน้าออเดอร์' : 'ลองใหม่'}</Text></Pressable> : <View style={styles.modalActions}><Pressable disabled={submitting} onPress={() => setConfirming(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>กลับไปแก้ไข</Text></Pressable><Pressable disabled={submitting} onPress={confirmSubmit} style={[styles.modalConfirm, styles.modalConfirmInRow]}><Text style={styles.modalConfirmText}>{submitting ? 'กำลังส่ง...' : 'ยืนยันส่งเรื่อง'}</Text></Pressable></View>}
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, scroll: { paddingBottom: 104 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, marginBottom: 17, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.96)' }, backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, backText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900' }, heroSubtitle: { color: 'rgba(255,255,255,.87)', fontSize: 12, lineHeight: 17, marginTop: 3 }, orderRef: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(126,39,7,.22)' }, orderRefText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  body: { padding: spacing.md, gap: 14 }, categoryCard: { padding: 15, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#FFD8C9', shadowColor: '#A8421B', shadowOpacity: .05, shadowRadius: 8, elevation: 2 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 }, sectionNumber: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, sectionNumberText: { color: colors.primary, fontSize: 15, fontWeight: '900' }, sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, sectionSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, category: { width: '48%', minHeight: 86, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FCFCFD' }, categoryWide: { width: '100%', minHeight: 70, alignItems: 'center' }, categoryActive: { borderColor: colors.primary, backgroundColor: colors.softOrange }, categoryIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, categoryIconActive: { backgroundColor: colors.primary }, categoryLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, categoryLabelActive: { color: colors.primaryDark }, categoryHint: { color: colors.textSecondary, fontSize: 9, lineHeight: 13, marginTop: 3 }, categoryHintActive: { color: '#A85A3D' }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  descriptionCard: { padding: 15, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, descriptionInput: { minHeight: 126, padding: 13, paddingBottom: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FCFCFD', color: colors.textPrimary, fontSize: 13, lineHeight: 19, outlineStyle: 'none' }, counter: { alignSelf: 'flex-end', color: colors.textSecondary, fontSize: 10, marginTop: -21, marginRight: 10, marginBottom: 7 }, errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 }, error: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.contactBorder, backgroundColor: colors.contactSoft }, tipIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, tipTitle: { color: colors.contactDark, fontSize: 12, fontWeight: '900' }, tipText: { color: '#52736F', fontSize: 10, lineHeight: 15, marginTop: 2 }, footer: { padding: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, pressed: { opacity: .82, transform: [{ scale: .98 }] },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, modalCard: { width: '100%', maxWidth: 390, padding: 22, borderRadius: 22, alignItems: 'center', backgroundColor: colors.surface }, modalIcon: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, modalIconError: { backgroundColor: '#FFF0F2' }, modalTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', marginTop: 12 }, modalMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 }, modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 21 }, modalCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background }, modalCancelText: { color: colors.textPrimary, fontWeight: '900', fontSize: 12 }, modalConfirm: { marginTop: 21, minWidth: 150, alignItems: 'center', paddingHorizontal: 17, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary }, modalConfirmInRow: { flex: 1.25, minWidth: 0, marginTop: 0 }, modalConfirmText: { color: colors.white, fontWeight: '900', fontSize: 12 },
});
