import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../client';
import DateTimeField from '../components/DateTimeField';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing } from '../components/theme';

function toLocalSqlDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function timeText(date) { return date ? date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--'; }
const destinations = ['เซเว่นอีเลฟเว่น', 'โลตัส', 'Big C', 'ร้านกาแฟ', 'ตลาด'];

function getTimeError(startTime, cutOffTime) {
  const now = new Date();
  if (startTime && startTime <= now) return 'เวลาเริ่มผ่านมาแล้ว กรุณาเลือกเวลาใหม่';
  if (cutOffTime && cutOffTime <= now) return 'เวลาสิ้นสุดผ่านมาแล้ว กรุณาเลือกเวลาใหม่';
  if (startTime && cutOffTime && cutOffTime <= startTime) return 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม';
  return null;
}

export default function CreateSlotScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [destination, setDestination] = useState('');
  const [fee, setFee] = useState('10');
  const [maxOrders, setMaxOrders] = useState(5);
  const [startTime, setStartTime] = useState(null);
  const [cutOffTime, setCutOffTime] = useState(null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [destinationPicker, setDestinationPicker] = useState(false);
  const timeError = getTimeError(startTime, cutOffTime);

  function validate() {
    const next = {};
    if (!destination.trim()) next.destination = 'กรุณาเลือกหรือระบุปลายทาง';
    if (maxOrders < 1) next.maxOrders = 'จำนวนคำขอต้องมากกว่า 0';
    if (!fee || Number(fee) < 0) next.fee = 'กรุณาระบุค่าหิ้ว';
    if (!startTime) next.startTime = 'กรุณาเลือกเวลาเริ่ม';
    else if (startTime <= new Date()) next.startTime = 'เวลาเริ่มต้องเป็นเวลาในอนาคต';
    if (!cutOffTime) next.cutOffTime = 'กรุณาเลือกเวลาสิ้นสุด';
    else if (cutOffTime <= new Date()) next.cutOffTime = 'เวลาสิ้นสุดต้องเป็นเวลาในอนาคต';
    else if (startTime && cutOffTime <= startTime) next.cutOffTime = 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม';
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  async function confirmCreate() {
    if (submitting) return;
    if (!validate()) {
      setConfirming(false);
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.post('/api/slots', { destination: destination.trim(), start_time: toLocalSqlDateTime(startTime), cut_off_time: toLocalSqlDateTime(cutOffTime), max_orders: maxOrders, fee: Number(fee) });
      setConfirming(false);
      navigation.popToTop();
    } catch (err) {
      setSubmitError(err.message || 'ไม่สามารถเปิดรอบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }
  function setQuickFee(value) { setFee(String(value)); setErrors((old) => ({ ...old, fee: undefined })); }
  function adjustFee(amount) { setQuickFee(Math.max(0, (Number(fee) || 0) + amount)); }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.runnerDark} /></View>
          <Text style={styles.backText}>กลับหน้าหลัก</Text>
        </Pressable>
        <View style={styles.heroTitleRow}>
          <View style={styles.heroIcon}><Ionicons name="storefront-outline" size={24} color={colors.runnerDark} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>สร้างรอบรับหิ้ว</Text>
            <Text style={styles.subtitle}>สร้างรอบรับหิ้วใหม่และกำหนดรายละเอียดให้ชัดเจน</Text>
          </View>
        </View>
      </View>

      <View style={styles.form}>
      <View style={styles.formHeading}>
        <View style={styles.formHeadingIcon}><Ionicons name="create-outline" size={19} color={colors.runner} /></View>
        <View><Text style={styles.formTitle}>รายละเอียดรอบรับหิ้ว</Text><Text style={styles.formSubtitle}>กรอกข้อมูลให้ครบก่อนเปิดรับออร์เดอร์</Text></View>
      </View>

      <Text style={styles.label}>ปลายทาง / ร้านค้า</Text>
      <Pressable onPress={() => setDestinationPicker(true)} style={[styles.selectField, errors.destination && styles.errorBorder]}><Text style={[styles.selectText, !destination && styles.placeholder]}>{destination || 'เลือกปลายทาง...'}</Text><Ionicons name="chevron-down" size={18} color={colors.textPrimary} /></Pressable>
      {!!errors.destination && <Text style={styles.error}>{errors.destination}</Text>}

      <Text style={styles.label}>ช่วงเวลา</Text>
      <View style={styles.timeLabels}><Text style={styles.timeCaption}>เริ่ม</Text><Text style={styles.timeCaption}>สิ้นสุด</Text></View>
      <View style={styles.timeRow}><View style={styles.timePicker}><DateTimeField compact minimumDate={new Date()} pickerTitle="ตั้งเวลาเริ่มรับออเดอร์" value={startTime} onChange={(date) => { setStartTime(date); setErrors((old) => ({ ...old, startTime: undefined })); }} /></View><Ionicons name="arrow-forward" size={18} color={timeError ? colors.danger : colors.textSecondary} style={styles.timeArrow} /><View style={styles.timePicker}><DateTimeField compact minimumDate={startTime ? new Date(startTime.getTime() + 60000) : new Date()} pickerTitle="ตั้งเวลาสิ้นสุดรับออเดอร์" value={cutOffTime} onChange={(date) => { setCutOffTime(date); setErrors((old) => ({ ...old, cutOffTime: undefined })); }} /></View></View>
      {timeError ? <View style={styles.timeErrorBox}><Ionicons name="alert-circle" size={16} color={colors.danger} /><Text style={styles.timeErrorText}>{timeError}</Text></View> : startTime && cutOffTime ? <View style={styles.validTimeBox}><Ionicons name="checkmark-circle" size={16} color={colors.runner} /><Text style={styles.validTime}>ช่วงเวลา {timeText(startTime)} – {timeText(cutOffTime)} น.</Text></View> : null}
      {!!errors.startTime && !timeError && <Text style={styles.error}>{errors.startTime}</Text>}{!!errors.cutOffTime && !timeError && <Text style={styles.error}>{errors.cutOffTime}</Text>}

      <Text style={styles.label}>จำนวนออร์เดอร์สูงสุด</Text>
      <View style={styles.stepper}><Pressable onPress={() => setMaxOrders((number) => Math.max(1, number - 1))} style={styles.stepperMinus}><Ionicons name="remove" size={20} color={colors.runner} /></Pressable><Text style={styles.stepperValue}>{maxOrders}</Text><Pressable onPress={() => setMaxOrders((number) => Math.min(99, number + 1))} style={styles.stepperPlus}><Ionicons name="add" size={20} color={colors.white} /></Pressable></View>

      <Text style={styles.label}>ค่าหิ้วต่อชิ้น (บาท)</Text>
      <View style={styles.feeChoices}>{[5, 8, 10, 15, 20].map((value) => <Pressable key={value} onPress={() => setQuickFee(value)} style={[styles.feeChip, Number(fee) === value && styles.feeChipActive]}><Text style={[styles.feeChipText, Number(fee) === value && styles.feeChipTextActive]}>{value}</Text></Pressable>)}</View>
      <View style={[styles.numberField, errors.fee && styles.errorBorder]}><TextInput value={fee} onChangeText={(value) => setFee(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={styles.numberInput} /><View style={styles.feeSpinner}><Pressable accessibilityLabel="เพิ่มค่าหิ้ว" onPress={() => adjustFee(1)} style={styles.spinnerButton}><Ionicons name="caret-up" size={12} color="#8D939B" /></Pressable><Pressable accessibilityLabel="ลดค่าหิ้ว" onPress={() => adjustFee(-1)} style={styles.spinnerButton}><Ionicons name="caret-down" size={12} color="#8D939B" /></Pressable></View></View>{!!errors.fee && <Text style={styles.error}>{errors.fee}</Text>}

      <Text style={styles.label}>หมายเหตุ (ถ้ามี)</Text><TextInput value={note} onChangeText={setNote} placeholder="เช่น ซื้อของได้ไม่เกิน 200 บาท, ไม่รับของแช่แข็ง..." placeholderTextColor={colors.textSecondary} multiline style={styles.noteInput} />
      </View>
    </ScrollView>
    <View style={styles.footer}><PrimaryButton label={timeError ? "กรุณาแก้ไขช่วงเวลา" : "เปิดรับหิ้ว! 🚀"} onPress={() => validate() && setConfirming(true)} loading={submitting} disabled={!!timeError} tone="runner" /></View>

    <Modal visible={destinationPicker} transparent animationType="fade" onRequestClose={() => setDestinationPicker(false)}>
      <View style={styles.modalShade}>
        <View style={styles.destinationCard}>
          <View style={styles.destinationHeader}>
            <View style={styles.destinationHeaderIcon}><Ionicons name="location" size={22} color={colors.white} /></View>
            <View style={{ flex: 1 }}><Text style={styles.modalTitle}>เลือกปลายทาง</Text><Text style={styles.modalSubtitle}>แตะเลือกร้านที่ต้องการ หรือระบุชื่อร้านเอง</Text></View>
            <Pressable onPress={() => setDestinationPicker(false)} style={styles.modalClose}><Ionicons name="close" size={20} color={colors.runnerDark} /></Pressable>
          </View>
          <Text style={styles.optionSectionLabel}>ปลายทางแนะนำ</Text>
          <View style={styles.destinationGrid}>
            {destinations.map((place) => {
              const selected = destination === place;
              return <Pressable
                key={place}
                onPress={() => { setDestination(place); setErrors((old) => ({ ...old, destination: undefined })); }}
                style={({ pressed }) => [styles.destinationOption, selected && styles.destinationOptionSelected, pressed && styles.optionPressed]}
              >
                <View style={[styles.optionIcon, selected && styles.optionIconSelected]}><Ionicons name="storefront-outline" size={18} color={selected ? colors.white : colors.runner} /></View>
                <Text style={[styles.destinationOptionText, selected && styles.destinationOptionTextSelected]}>{place}</Text>
                <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={19} color={selected ? colors.runner : colors.textSecondary} />
              </Pressable>;
            })}
          </View>
          <Text style={styles.optionSectionLabel}>ปลายทางอื่น</Text>
          <View style={styles.customDestinationWrap}>
            <Ionicons name="search-outline" size={19} color={colors.runner} />
            <TextInput
              value={destinations.includes(destination) ? '' : destination}
              onChangeText={(value) => { setDestination(value); setErrors((old) => ({ ...old, destination: undefined })); }}
              placeholder="พิมพ์ชื่อร้านหรือปลายทาง..."
              placeholderTextColor={colors.textSecondary}
              style={styles.customDestination}
            />
          </View>
          <Pressable disabled={!destination.trim()} onPress={() => setDestinationPicker(false)} style={({ pressed }) => [styles.destinationDone, !destination.trim() && styles.destinationDoneDisabled, pressed && styles.pressed]}><Text style={styles.destinationDoneText}>ยืนยันปลายทาง</Text><Ionicons name="checkmark-circle" size={19} color={colors.white} /></Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => !submitting && setConfirming(false)}><View style={styles.modalShade}><View style={styles.confirmCard}><View style={styles.confirmIcon}><Ionicons name="rocket-outline" size={26} color={colors.runnerDark} /></View><Text style={styles.confirmTitle}>เปิดรับหิ้วรอบนี้?</Text><Text style={styles.confirmMessage}>ปลายทาง: {destination}{'\n'}รับสูงสุด {maxOrders} คำขอ · ค่าหิ้ว ฿{fee}</Text>{!!submitError && <View style={styles.submitErrorBox}><Ionicons name="alert-circle" size={17} color={colors.danger} /><Text style={styles.submitErrorText}>{submitError}</Text></View>}<View style={styles.confirmActions}><Pressable accessibilityRole="button" disabled={submitting} onPress={() => { setSubmitError(''); setConfirming(false); }} style={({ pressed }) => [styles.cancelButton, pressed && !submitting && styles.pressed]}><Text style={styles.cancelText}>แก้ไข</Text></Pressable><Pressable accessibilityRole="button" hitSlop={6} disabled={submitting} onPress={() => confirmCreate()} style={({ pressed }) => [styles.confirmButton, submitting && styles.confirmButtonDisabled, pressed && !submitting && styles.confirmButtonPressed]}>{submitting ? <View style={styles.confirmLoading}><Text style={styles.confirmText}>กำลังเปิดรับ...</Text></View> : <View style={styles.confirmLoading}><Text style={styles.confirmText}>ยืนยันเปิดรับ</Text><Ionicons name="checkmark-circle" size={18} color={colors.white} /></View>}</Pressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: 110 },
  hero: { backgroundColor: colors.runner, paddingHorizontal: spacing.md, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, marginBottom: 17, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.94)' },
  backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen },
  backText: { color: colors.runnerDark, fontSize: 13, fontWeight: '900' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  pressed: { opacity: .75, transform: [{ scale: .98 }] },
  title: { color: colors.white, fontSize: 25, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,.88)', fontSize: 12, lineHeight: 18, marginTop: 3 },
  form: { margin: spacing.md, marginTop: 18, padding: spacing.md, paddingTop: 15, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DDECE4' },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 13, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  formHeadingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen },
  formTitle: { color: colors.runnerDark, fontSize: 16, fontWeight: '900' },
  formSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginBottom: 8, marginTop: 18 },
  selectField: { height: 50, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.softGreen, borderWidth: 1.5, borderColor: '#A8E4C3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { color: colors.runnerDark, fontSize: 14, fontWeight: '800' },
  placeholder: { color: colors.runnerDark, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 11, marginTop: 5, fontWeight: '700' }, errorBorder: { borderColor: colors.danger },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 7, marginBottom: 5 }, timeCaption: { width: '42%', color: colors.textSecondary, fontSize: 11, fontWeight: '700' }, timeRow: { flexDirection: 'row', alignItems: 'center' }, timePreview: { width: '43%', height: 48, borderRadius: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, timeValue: { fontWeight: '900', color: colors.textPrimary, fontSize: 14 }, timeArrow: { width: '14%', textAlign: 'center' }, timePicker: { width: '43%' }, validTimeBox: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.softGreen }, validTime: { flex: 1, color: colors.runnerDark, fontSize: 12, fontWeight: '800' }, timeErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FFF0F2' }, timeErrorText: { flex: 1, color: colors.danger, fontSize: 12, fontWeight: '800' },
  stepper: { height: 68, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, stepperMinus: { height: 37, width: 37, borderRadius: 20, borderColor: colors.runner, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, stepperPlus: { height: 37, width: 37, borderRadius: 20, backgroundColor: colors.runner, alignItems: 'center', justifyContent: 'center' }, stepperValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  feeChoices: { flexDirection: 'row', gap: 10 }, feeChip: { flex: 1, height: 40, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, feeChipActive: { borderColor: colors.runner, backgroundColor: colors.runner }, feeChipText: { color: colors.textPrimary, fontWeight: '900', fontSize: 13 }, feeChipTextActive: { color: colors.white }, numberField: { height: 45, marginTop: 8, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }, numberInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary }, feeSpinner: { width: 41, height: 36, marginRight: 4, borderLeftWidth: 1, borderLeftColor: colors.border, justifyContent: 'center' }, spinnerButton: { flex: 1, alignItems: 'center', justifyContent: 'center' }, noteInput: { minHeight: 72, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, textAlignVertical: 'top', fontSize: 13 }, footer: { padding: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  modalShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,.56)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  destinationCard: { width: '100%', maxWidth: 410, maxHeight: '92%', backgroundColor: colors.surface, borderRadius: 24, padding: 18 },
  destinationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: -18, marginBottom: 17, padding: 17, backgroundColor: colors.runner, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  destinationHeaderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.2)' },
  modalTitle: { color: colors.white, fontSize: 19, fontWeight: '900' },
  modalSubtitle: { color: 'rgba(255,255,255,.88)', fontSize: 11, marginTop: 2 },
  modalClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  optionSectionLabel: { color: colors.runnerDark, fontSize: 12, fontWeight: '900', marginBottom: 8, marginTop: 3 },
  destinationGrid: { gap: 8, marginBottom: 14 },
  destinationOption: { minHeight: 52, paddingHorizontal: 11, flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  destinationOptionSelected: { borderColor: colors.runner, borderWidth: 1.5, backgroundColor: colors.softGreen },
  optionIcon: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen },
  optionIconSelected: { backgroundColor: colors.runner },
  destinationOptionText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  destinationOptionTextSelected: { color: colors.runnerDark },
  optionPressed: { opacity: .7, transform: [{ scale: .99 }] },
  customDestinationWrap: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 13, borderWidth: 1.5, borderColor: '#A8E4C3', backgroundColor: colors.softGreen, paddingHorizontal: 12 },
  customDestination: { flex: 1, height: '100%', color: colors.textPrimary, fontSize: 13 },
  destinationDone: { marginTop: 15, backgroundColor: colors.runner, borderRadius: 13, height: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  destinationDoneDisabled: { opacity: .45 },
  destinationDoneText: { color: colors.white, fontWeight: '900' },
  confirmCard: { width: '100%', maxWidth: 390, backgroundColor: colors.surface, borderRadius: 21, padding: 22, alignItems: 'center' }, confirmIcon: { height: 52, width: 52, borderRadius: 26, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' }, confirmTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 19, marginTop: 12 }, confirmMessage: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 7 }, submitErrorBox: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 13, padding: 10, borderRadius: 11, backgroundColor: '#FFF0F2', borderWidth: 1, borderColor: '#FFD4DA' }, submitErrorText: { flex: 1, color: colors.danger, fontSize: 11, lineHeight: 17, fontWeight: '700' }, confirmActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 21 }, cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 11, backgroundColor: colors.background }, confirmButton: { flex: 1.12, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 11, backgroundColor: colors.runner, cursor: 'pointer' }, confirmButtonDisabled: { opacity: .65 }, confirmButtonPressed: { opacity: .86, transform: [{ scale: .98 }] }, confirmLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, cancelText: { color: colors.textSecondary, fontWeight: '900' }, confirmText: { color: colors.white, fontWeight: '900' },
});
