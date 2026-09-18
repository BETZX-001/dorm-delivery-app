import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable, Modal, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing } from '../components/theme';

const newItem = () => ({ id: `${Date.now()}-${Math.random()}`, name: '', quantity: 1 });
const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

function Info({ icon, label, value }) {
  return <View style={styles.infoBox}><View style={styles.infoIcon}><Ionicons name={icon} size={16} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={1}>{value}</Text></View></View>;
}

export default function PlaceOrderScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { systemRevision } = useAuth();
  const [slot, setSlot] = useState(route.params.slot);
  const [items, setItems] = useState([newItem()]);
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const filledItems = useMemo(() => items.filter((item) => item.name.trim()), [items]);
  const fee = Number(slot.fee || 0);
  const budget = Number(String(estimatedBudget).replace(/,/g, '')) || 0;
  const total = fee + budget;
  const remaining = Math.max(0, Number(slot.max_orders || 0) - Number(slot.current_orders || 0));

  useEffect(() => {
    if (!systemRevision) return;
    api.get(`/api/slots/${slot.slot_id}`).then((result) => setSlot(result.slot)).catch(() => {});
  }, [systemRevision, slot.slot_id]);

  function updateItem(id, patch) {
    setItems((list) => list.map((item) => item.id === id ? { ...item, ...patch } : item));
    setErrors((old) => ({ ...old, items: undefined }));
  }
  function changeQuantity(id, change) {
    setItems((list) => list.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item));
  }
  function removeItem(id) { if (items.length > 1) setItems((list) => list.filter((item) => item.id !== id)); }
  function adjustBudget(amount) { setEstimatedBudget(String(Math.max(0, budget + amount))); }
  function validate() {
    const next = {};
    if (!filledItems.length) next.items = 'กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ';
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function handleSubmit() { if (validate()) setConfirming(true); }
  async function confirmSubmit() {
    setSubmitting(true);
    try {
      // The API has one order row per request. Serialize every product into it so the runner sees the complete list.
      const shoppingList = filledItems.map((item) => `${item.name.trim()} × ${item.quantity}`).join('\n');
      await api.post('/api/orders', { slot_id: slot.slot_id, item_name: shoppingList, quantity: 1, note: budget ? `งบประมาณโดยประมาณ ฿${budget.toLocaleString('th-TH')}` : null });
      setConfirming(false);
      navigation.popToTop();
    } catch (err) { Alert.alert('ฝากซื้อไม่สำเร็จ', err.message); } finally { setSubmitting(false); }
  }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.primaryDark} /></View><Text style={styles.backText}>กลับหน้าหลัก</Text></Pressable>
        <View style={styles.heroTitleRow}><View style={styles.heroIcon}><Ionicons name="bag-handle-outline" size={24} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.heroTitle}>ส่งคำขอฝากซื้อ</Text><Text style={styles.heroSubtitle}>ตรวจสอบรอบและเพิ่มรายการที่ต้องการ</Text></View></View>
      </View>
      <View style={styles.placeBody}>
      <View style={styles.runnerCard}>
      <Pressable onPress={() => navigation.navigate('PublicProfile', { userId: slot.runner_id, initialProfile: { name: slot.runner_name, profile_image: slot.runner_profile_image, avg_rating: slot.runner_rating } })} style={({ pressed }) => [styles.runnerHeader, pressed && styles.pressed]}>
        <View style={styles.avatar}>{slot.runner_profile_image ? <Image source={{ uri: slot.runner_profile_image }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(slot.runner_name || 'ร').charAt(0)}</Text>}</View>
        <View style={styles.runnerCopy}><Text style={styles.runnerName}>{slot.runner_name || 'ผู้รับหิ้ว'}</Text><View style={styles.rating}><Text style={styles.stars}>★★★★★</Text><Text style={styles.ratingValue}>{Number(slot.runner_rating || 0).toFixed(1)}</Text></View></View>
        <View><View style={styles.openBadge}><Text style={styles.openText}>เปิดรับ</Text></View><Text style={styles.viewProfile}>ดูโปรไฟล์ ›</Text></View>
      </Pressable>
      <View style={styles.infoGrid}>
        <Info icon="business-outline" label="ปลายทาง" value={slot.destination || '-'} /><Info icon="time-outline" label="เวลา" value={formatTime(slot.cut_off_time)} />
        <Info icon="cash-outline" label="ค่าหิ้วต่อคำขอ" value={`฿${fee.toLocaleString('th-TH')}`} /><Info icon="cube-outline" label="ที่ว่าง" value={`${remaining}/${slot.max_orders || 0}`} />
      </View>
      </View>
      <View style={styles.orderForm}>
      <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name="list-outline" size={19} color={colors.primary} /></View><View><Text style={styles.sectionTitle}>รายการที่ต้องการ</Text><Text style={styles.sectionSubtitle}>เพิ่มชื่อสินค้าและจำนวนให้ครบถ้วน</Text></View></View>
      <View style={styles.itemsCard}>{items.map((item, index) => <View key={item.id} style={styles.itemRow}>
        <Text style={styles.itemNumber}>{index + 1}.</Text><TextInput value={item.name} onChangeText={(name) => updateItem(item.id, { name })} placeholder="ชื่อสินค้า เช่น น้ำดื่ม 1.5L" placeholderTextColor={colors.textSecondary} style={styles.itemInput} />
        <Pressable onPress={() => changeQuantity(item.id, -1)} style={styles.roundButton}><Ionicons name="remove" size={16} color={colors.textSecondary} /></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} style={styles.plusButton}><Ionicons name="add" size={16} color={colors.white} /></Pressable>
        {items.length > 1 && <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={styles.removeButton}><Ionicons name="close" size={15} color={colors.danger} /></Pressable>}
      </View>)}</View>
      {!!errors.items && <Text style={styles.error}>{errors.items}</Text>}
      <Pressable onPress={() => setItems((list) => [...list, newItem()])} style={({ pressed }) => [styles.addItem, pressed && styles.pressed]}><Ionicons name="add" size={21} color={colors.primary} /><Text style={styles.addItemText}>เพิ่มรายการ</Text></Pressable>
      <Text style={styles.inputLabel}>งบประมาณโดยประมาณ (บาท)</Text>
      <View style={styles.budgetField}><TextInput value={estimatedBudget} onChangeText={(value) => setEstimatedBudget(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="เช่น 150" placeholderTextColor={colors.textSecondary} style={styles.budgetInput} /><View style={styles.spinnerControls}><Pressable accessibilityLabel="เพิ่มงบประมาณ" onPress={() => adjustBudget(10)} hitSlop={7} style={styles.spinnerButton}><Ionicons name="caret-up" size={12} color="#8D939B" /></Pressable><Pressable accessibilityLabel="ลดงบประมาณ" onPress={() => adjustBudget(-10)} hitSlop={7} style={styles.spinnerButton}><Ionicons name="caret-down" size={12} color="#8D939B" /></Pressable></View></View>
      <View style={styles.summary}><View style={styles.summaryLine}><Text style={styles.summaryLabel}>ค่าหิ้ว (1 คำขอ)</Text><Text style={styles.summaryValue}>฿{fee.toLocaleString('th-TH')}</Text></View><View style={styles.summaryLine}><Text style={styles.summaryLabel}>งบสินค้า (ประมาณ)</Text><Text style={styles.summaryValue}>{budget ? `฿${budget.toLocaleString('th-TH')}` : '— บาท'}</Text></View><View style={styles.summaryDivider} /><View style={styles.summaryLine}><Text style={styles.totalLabel}>รวมโดยประมาณ</Text><Text style={styles.totalValue}>฿{total.toLocaleString('th-TH')}</Text></View></View>
      </View>
      </View>
    </ScrollView>
    <View style={styles.stickyFooter}><PrimaryButton label="ส่งคำขอฝากซื้อ 🛍️" onPress={handleSubmit} loading={submitting} /></View>
    <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => !submitting && setConfirming(false)}><View style={styles.modalShade}><View style={styles.confirmCard}><View style={styles.confirmIcon}><Ionicons name="bag-check-outline" size={27} color={colors.primary} /></View><Text style={styles.confirmTitle}>ยืนยันคำขอฝากซื้อ?</Text><Text style={styles.confirmMessage}>{filledItems.length} รายการ · ค่าหิ้ว ฿{fee.toLocaleString('th-TH')}{'\n'}ผู้รับหิ้ว: {slot.runner_name || 'ผู้รับหิ้ว'}</Text><View style={styles.confirmActions}><Pressable disabled={submitting} onPress={() => setConfirming(false)} style={styles.cancelButton}><Text style={styles.cancelText}>แก้ไข</Text></Pressable><Pressable disabled={submitting} onPress={confirmSubmit} style={({ pressed }) => [styles.confirmButton, pressed && !submitting && styles.pressed]}><Text style={styles.confirmText}>{submitting ? 'กำลังส่ง...' : 'ยืนยันส่งคำขอ'}</Text></Pressable></View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, container: { paddingBottom: 110 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, marginBottom: 17, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.95)' },
  backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange },
  backText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,.88)', fontSize: 12, marginTop: 3 },
  placeBody: { padding: spacing.md, gap: 14 },
  runnerCard: { padding: 15, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#FFD8C9', shadowColor: '#A8421B', shadowOpacity: .07, shadowRadius: 7, elevation: 2 },
  runnerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 }, avatar: { width: 54, height: 54, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: 54, height: 54 }, avatarText: { color: colors.white, fontSize: 22, fontWeight: '900' }, runnerCopy: { flex: 1, marginLeft: 12 }, runnerName: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' }, rating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }, stars: { color: '#FFB800', fontSize: 16, letterSpacing: 1 }, ratingValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, openBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.softGreen }, openText: { color: colors.runner, fontWeight: '900', fontSize: 11 }, viewProfile: { color: colors.primary, fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, infoBox: { width: '48.7%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.softOrange, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, minHeight: 62 }, infoIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, infoLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' }, infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 2 },
  orderForm: { padding: 15, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 13, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange },
  sectionTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  sectionSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  itemsCard: { gap: 9 }, itemRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54, backgroundColor: '#FCFCFD', borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, gap: 7 }, itemNumber: { color: colors.primary, fontWeight: '900', fontSize: 13 }, itemInput: { flex: 1, color: colors.textPrimary, fontSize: 13, paddingVertical: 9, minWidth: 50, outlineStyle: 'none' }, roundButton: { height: 27, width: 27, borderRadius: 14, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white }, quantity: { width: 16, textAlign: 'center', fontWeight: '900', color: colors.textPrimary, fontSize: 13 }, plusButton: { height: 27, width: 27, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }, removeButton: { marginLeft: 1 }, error: { color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 5 },
  addItem: { marginTop: 13, height: 45, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, backgroundColor: colors.softOrange }, addItemText: { color: colors.primary, fontSize: 14, fontWeight: '900' }, inputLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 20, marginBottom: 8 }, budgetField: { height: 50, flexDirection: 'row', alignItems: 'center', borderRadius: 14, backgroundColor: '#FCFCFD', borderWidth: 1, borderColor: colors.border }, budgetInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 14, color: colors.textPrimary, outlineStyle: 'none' }, spinnerControls: { width: 42, height: 38, marginRight: 4, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }, spinnerButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: 15, borderRadius: 16, backgroundColor: colors.softOrange, padding: 14 }, summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }, summaryLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }, summaryValue: { color: colors.primary, fontSize: 13, fontWeight: '900' }, summaryDivider: { height: 1, backgroundColor: '#FFD9CA', marginVertical: 7 }, totalLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' }, totalValue: { color: colors.primary, fontSize: 16, fontWeight: '900' }, stickyFooter: { padding: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  modalShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, .45)', alignItems: 'center', justifyContent: 'center', padding: 22 }, confirmCard: { width: '100%', maxWidth: 390, backgroundColor: colors.surface, borderRadius: 21, padding: 22, alignItems: 'center' }, confirmIcon: { height: 52, width: 52, borderRadius: 26, backgroundColor: colors.softOrange, alignItems: 'center', justifyContent: 'center' }, confirmTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 19, marginTop: 12 }, confirmMessage: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 7 }, confirmActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 21 }, cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: colors.background }, confirmButton: { flex: 1.35, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: colors.primary }, cancelText: { color: colors.textSecondary, fontWeight: '900' }, confirmText: { color: colors.white, fontWeight: '900', fontSize: 12 },
});
