import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import FormInput from '../components/FormInput';
import DateTimeField from '../components/DateTimeField';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, typography } from '../components/theme';

function toLocalSqlDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function EditSlotScreen({ route, navigation }) {
  const { slot } = route.params;
  const [destination, setDestination] = useState(slot.destination || '');
  const [fee, setFee] = useState(String(slot.fee ?? ''));
  const [maxOrders, setMaxOrders] = useState(String(slot.max_orders ?? 1));
  const [cutOffTime, setCutOffTime] = useState(new Date(slot.cut_off_time));
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!destination.trim() || !cutOffTime || !maxOrders) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบ');
    }
    if (cutOffTime <= new Date()) return Alert.alert('เวลาไม่ถูกต้อง', 'กรุณาเลือกเวลาปิดรับที่ยังไม่ผ่านไป');
    setLoading(true);
    try {
      await api.patch(`/api/slots/${slot.slot_id}`, {
        destination: destination.trim(),
        fee: Number(fee || 0),
        max_orders: Number(maxOrders),
        cut_off_time: toLocalSqlDateTime(cutOffTime),
      });
      Alert.alert('บันทึกแล้ว', 'อัปเดตเงื่อนไขการรับหิ้วเรียบร้อย', [{ text: 'ตกลง', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('บันทึกไม่สำเร็จ', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={20} color={colors.textPrimary} /><Text style={styles.backText}>กลับไปดูออร์เดอร์</Text></Pressable>
      <Text style={styles.title}>แก้ไขรอบรับหิ้ว</Text>
      <Text style={styles.subtitle}>แก้ไขได้ก่อนมีผู้ฝากหิ้วในรอบนี้</Text>
      <View style={styles.notice}><Ionicons name="information-circle" size={18} color={colors.runnerDark} /><Text style={styles.noticeText}>เมื่อมีผู้ฝากหิ้วแล้ว ระบบจะล็อกเงื่อนไขเพื่อคุ้มครองทั้งสองฝ่าย</Text></View>
      <FormInput label="ปลายทาง / ร้านค้า" value={destination} onChangeText={setDestination} placeholder="เช่น เซเว่น, โลตัส" />
      <FormInput label="ค่าหิ้วต่อออเดอร์ (บาท)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" placeholder="เช่น 10" />
      <FormInput label="จำนวนออเดอร์สูงสุด" value={maxOrders} onChangeText={setMaxOrders} keyboardType="number-pad" placeholder="5" />
      <DateTimeField label="เวลาปิดรับออเดอร์" value={cutOffTime} onChange={setCutOffTime} />
      <PrimaryButton label="บันทึกการแก้ไข" onPress={save} loading={loading} tone="runner" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.lg, backgroundColor: colors.background },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.surface, marginBottom: 18 },
  backText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  title: { ...typography.h1, color: colors.textPrimary, fontSize: 25 },
  subtitle: { ...typography.body, color: colors.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 16 },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 13, backgroundColor: colors.softGreen, marginBottom: 18 },
  noticeText: { flex: 1, color: colors.runnerDark, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
