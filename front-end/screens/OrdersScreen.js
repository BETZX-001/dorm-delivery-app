import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing, radii, typography } from '../components/theme';

function formatCutOff(value) {
  if (!value) return 'ไม่ระบุเวลา';
  return new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function OrdersScreen({ navigation }) {
  const { activeRole, systemRevision } = useAuth();
  const isRunner = activeRole === 'RUNNER';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orderView, setOrderView] = useState('CURRENT');
  const [error, setError] = useState(null);
  const load = useCallback(async (fresh = false) => {
    try {
      const response = await (fresh ? api.get : api.getCached)(isRunner ? '/api/orders/runner/mine' : '/api/orders/mine');
      setEntries(response.orders || []);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [isRunner]);
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  useEffect(() => { const timer = setInterval(load, 300_000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { if (systemRevision) load(true); }, [systemRevision, load]);
  useEffect(() => { setOrderView('CURRENT'); }, [isRunner]);
  if (loading) return <ActivityIndicator style={{ marginTop: spacing.lg }} color={isRunner ? colors.runner : colors.primary} />;

  const accent = isRunner ? colors.runner : colors.primary;
  const soft = isRunner ? colors.softGreen : colors.softOrange;
  const currentEntries = entries.filter((item) => !['COMPLETED', 'REJECTED'].includes(item.order_status));
  const historyEntries = entries.filter((item) => ['COMPLETED', 'REJECTED'].includes(item.order_status));
  const visibleEntries = orderView === 'HISTORY' ? historyEntries : currentEntries;
  const title = isRunner ? 'ออร์เดอร์รับหิ้วของฉัน' : 'ออร์เดอร์ของฉัน';
  const subtitle = orderView === 'HISTORY' ? 'ออเดอร์ที่เสร็จสิ้นหรือถูกยกเลิก' : isRunner ? 'งานที่รอรับและกำลังดำเนินการ' : 'ติดตามสถานะการฝากซื้อได้ที่นี่';
  return <FlatList
    style={styles.container}
    contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={isRunner ? colors.runner : colors.primary} />}
    data={visibleEntries}
    extraData={{ orderView, isRunner }}
    keyExtractor={(item) => String(item.order_id)}
    ListHeaderComponent={<><View style={styles.header}><View style={[styles.headerIcon, { backgroundColor: soft }]}><Ionicons name={orderView === 'HISTORY' ? 'time-outline' : isRunner ? 'storefront-outline' : 'receipt-outline'} size={23} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View></View><View style={styles.orderSwitch}><Pressable onPress={() => setOrderView('CURRENT')} style={[styles.orderSwitchButton, orderView === 'CURRENT' && { backgroundColor: accent }]}><Ionicons name="pulse-outline" size={17} color={orderView === 'CURRENT' ? colors.white : colors.textSecondary} /><View><Text style={[styles.orderSwitchText, orderView === 'CURRENT' && styles.orderSwitchTextActive]}>ออเดอร์ปัจจุบัน</Text><Text style={[styles.orderSwitchCount, orderView === 'CURRENT' && styles.orderSwitchTextActive]}>{currentEntries.length} รายการ</Text></View></Pressable><Pressable onPress={() => setOrderView('HISTORY')} style={[styles.orderSwitchButton, orderView === 'HISTORY' && { backgroundColor: accent }]}><Ionicons name="time-outline" size={17} color={orderView === 'HISTORY' ? colors.white : colors.textSecondary} /><View><Text style={[styles.orderSwitchText, orderView === 'HISTORY' && styles.orderSwitchTextActive]}>ประวัติออเดอร์</Text><Text style={[styles.orderSwitchCount, orderView === 'HISTORY' && styles.orderSwitchTextActive]}>{historyEntries.length} รายการ</Text></View></Pressable></View></>}
    ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: soft }]}><Ionicons name={error ? 'cloud-offline-outline' : orderView === 'HISTORY' ? 'time-outline' : isRunner ? 'bicycle-outline' : 'bag-handle-outline'} size={29} color={accent} /></View><Text style={styles.emptyTitle}>{error ? 'โหลดออเดอร์ไม่สำเร็จ' : orderView === 'HISTORY' ? 'ยังไม่มีประวัติออเดอร์' : isRunner ? 'ยังไม่มีงานที่กำลังดำเนินการ' : 'ยังไม่มีออเดอร์ปัจจุบัน'}</Text><Text style={styles.emptyText}>{error || (orderView === 'HISTORY' ? 'ออเดอร์ที่เสร็จสิ้นหรือถูกยกเลิกจะแสดงที่นี่' : isRunner ? 'เมื่อมีผู้ฝากหิ้ว รายการจะแสดงที่นี่' : 'ค้นหารอบรับหิ้วได้จากหน้าหลัก')}</Text>{error ? <Pressable onPress={load} style={[styles.retryButton, { borderColor: accent }]}><Text style={{ color: accent, fontWeight: '900' }}>ลองใหม่</Text></Pressable> : null}</View>}
    renderItem={({ item }) => isRunner ? <RunnerOrder item={item} navigation={navigation} historical={orderView === 'HISTORY'} /> : <RequesterOrder item={item} navigation={navigation} />}
  />;
}

function RunnerOrder({ item, navigation, historical }) {
  return <Pressable onPress={() => navigation.navigate('RunnerDashboard', { slotId: item.slot_id, returnToOrders: true, initialView: historical ? 'HISTORY' : 'ACTIVE' })} style={({ pressed }) => [styles.card, historical && styles.historyCard, pressed && styles.pressed]}>
    <View style={styles.cardHeader}><View style={[styles.itemIcon, { backgroundColor: colors.softGreen }]}><Ionicons name="person-outline" size={19} color={colors.runner} /></View><View style={styles.itemDetails}><Text style={styles.itemName}>{item.requester_name}</Text><Text style={styles.destination}>{item.dorm_name || 'ไม่ระบุหอพัก'} · ห้อง {item.room_number || '-'} · {item.destination}</Text></View><StatusBadge status={item.order_status} tone="runner" /></View>
    <Text style={styles.runnerItems}>{item.item_name} × {item.quantity}</Text>
    {item.order_status === 'DELIVERING' && <Pressable disabled={!item.requester_phone} onPress={(event) => { event.stopPropagation?.(); if (item.requester_phone) Linking.openURL(`tel:${String(item.requester_phone).replace(/[^\d+]/g, '')}`); }} style={[styles.runnerContact, !item.requester_phone && { opacity: .55 }]}><View style={styles.runnerContactIcon}><Ionicons name="call" size={16} color={colors.white} /></View><View style={{ flex: 1 }}><Text style={styles.runnerContactLabel}>ติดต่อผู้ฝากหิ้ว</Text><Text style={styles.runnerContactPhone}>{item.requester_phone ? 'แตะเพื่อโทรติดต่อโดยตรง' : 'ผู้ใช้ยังไม่ได้ระบุเบอร์โทร'}</Text></View>{!!item.requester_phone && <Text style={styles.runnerContactAction}>โทร</Text>}</Pressable>}
    <View style={styles.manageRow}><Text style={styles.manageText}>{historical ? 'ดูรายละเอียดประวัติ' : 'ดูและจัดการออร์เดอร์'}</Text><Text style={styles.runnerFee}>฿{Number(item.fee || 0)}</Text></View>
  </Pressable>;
}

function RequesterOrder({ item, navigation }) {
  return <Pressable onPress={() => navigation.navigate('Tracking', { order: item })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.cardHeader}><View style={styles.itemIcon}><Ionicons name="bag-handle-outline" size={19} color={colors.primary} /></View><View style={styles.itemDetails}><Text style={styles.itemName}>{item.item_name} <Text style={styles.quantity}>× {item.quantity}</Text></Text><Text style={styles.destination}><Ionicons name="storefront-outline" size={12} /> {item.destination}</Text></View><StatusBadge status={item.order_status} /></View>
    <View style={styles.cutOff}><Ionicons name="time-outline" size={15} color={colors.textSecondary} /><Text style={styles.cutOffText}>ปิดรับ: {formatCutOff(item.cut_off_time)}</Text></View>
    <View style={styles.actions}>{item.order_status === 'COMPLETED' && (item.has_review ? <View style={[styles.reviewButton, styles.reviewedButton]}><Ionicons name="checkmark-circle" size={16} color={colors.runner} /><Text style={styles.reviewedText}>ให้คะแนนแล้ว</Text></View> : <Pressable onPress={() => navigation.navigate('Review', { order: item })} style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]}><Ionicons name="star-outline" size={16} color={colors.primary} /><Text style={styles.reviewText}>ให้คะแนนผู้รับหิ้ว</Text></Pressable>)}<Pressable onPress={() => navigation.navigate('Report', { order_id: item.order_id })} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}><Ionicons name="flag-outline" size={16} color={colors.danger} /><Text style={styles.reportText}>แจ้งปัญหา</Text></Pressable></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: 36 }, header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 }, headerIcon: { height: 43, width: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, title: { ...typography.h2, color: colors.textPrimary, fontSize: 23 }, subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  orderSwitch: { flexDirection: 'row', gap: 7, padding: 5, marginBottom: 17, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, orderSwitchButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 }, orderSwitchText: { color: colors.textPrimary, fontSize: 11, fontWeight: '900' }, orderSwitchCount: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, orderSwitchTextActive: { color: colors.white },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 19, padding: 15, marginBottom: 12 }, historyCard: { backgroundColor: '#FCFCFD' }, cardHeader: { flexDirection: 'row', alignItems: 'center' }, itemIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange, marginRight: 10 }, itemDetails: { flex: 1 }, itemName: { color: colors.textPrimary, fontWeight: '900', fontSize: 16 }, quantity: { color: colors.textSecondary, fontSize: 14 }, destination: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  runnerStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, padding: 12, borderRadius: 13, backgroundColor: colors.softGreen }, runnerStatValue: { color: colors.runnerDark, fontSize: 15, fontWeight: '900', textAlign: 'center' }, runnerStatLabel: { color: colors.runnerDark, fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' }, manageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 }, manageText: { color: colors.runnerDark, fontSize: 13, fontWeight: '900' },
  runnerItems: { color: colors.textPrimary, fontSize: 13, marginTop: 13, padding: 11, borderRadius: 11, backgroundColor: colors.background }, runnerFee: { color: colors.runner, fontSize: 15, fontWeight: '900' },
  runnerContact: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.contactBorder, backgroundColor: colors.contactSoft }, runnerContactIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.contact }, runnerContactLabel: { color: '#52736F', fontSize: 9, fontWeight: '700' }, runnerContactPhone: { color: colors.contactDark, fontSize: 13, fontWeight: '900', marginTop: 1 }, runnerContactAction: { color: colors.white, fontSize: 11, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.contact },
  cutOff: { marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 5 }, cutOffText: { color: colors.textSecondary, fontSize: 12 }, actions: { flexDirection: 'row', gap: 9, marginTop: 13 }, reviewButton: { flex: 1, height: 40, borderWidth: 1, borderColor: '#FFD1BF', borderRadius: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: colors.softOrange }, reviewText: { color: colors.primary, fontSize: 12, fontWeight: '900' }, reviewedButton: { borderColor: '#CDEAD7', backgroundColor: colors.softGreen }, reviewedText: { color: colors.runnerDark, fontSize: 12, fontWeight: '900' }, reportButton: { flex: 1, height: 40, borderWidth: 1, borderColor: '#FFD9DE', borderRadius: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#FFF6F7' }, reportText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 17, marginTop: 11 }, emptyText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 }, pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  retryButton: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
});
