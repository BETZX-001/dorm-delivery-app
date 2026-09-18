import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import ProfilePageHeader from '../components/ProfilePageHeader';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing } from '../components/theme';

export default function ProfileOrderHistoryScreen({ route, navigation }) {
  const type = route.params?.type === 'RUNNER' ? 'RUNNER' : 'REQUESTER';
  const runner = type === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.getCached(runner ? '/api/orders/runner/mine' : '/api/orders/mine');
      setOrders((result.orders || []).filter((order) => ['COMPLETED', 'REJECTED'].includes(order.order_status)));
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [runner]);
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return <View style={styles.page}>
    <ProfilePageHeader navigation={navigation} icon={runner ? 'bicycle-outline' : 'bag-handle-outline'} title={runner ? 'ประวัติการรับออเดอร์' : 'ประวัติการฝากซื้อ'} subtitle={runner ? 'งานรับหิ้วที่เสร็จสิ้นและถูกยกเลิก' : 'รายการฝากซื้อที่ผ่านมา'} />
    {loading ? <ActivityIndicator style={{ flex: 1 }} color={accent} /> : <FlatList data={orders} keyExtractor={(item) => String(item.order_id)} contentContainerStyle={styles.content} ListHeaderComponent={error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={load}><Text style={{ color: accent, fontWeight: '900' }}>ลองใหม่</Text></Pressable></View> : null} ListEmptyComponent={<View style={styles.empty}><Ionicons name="time-outline" size={34} color={accent} /><Text style={styles.emptyTitle}>ยังไม่มีประวัติออเดอร์</Text><Text style={styles.emptyText}>ออเดอร์ที่เสร็จสิ้นจะปรากฏที่นี่</Text></View>} renderItem={({ item }) => <View style={styles.card}><View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: runner ? colors.softGreen : colors.softOrange }]}><Ionicons name={runner ? 'bicycle-outline' : 'bag-handle-outline'} size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.item}>{item.item_name} × {item.quantity}</Text><Text style={styles.meta}>{runner ? item.requester_name || 'ผู้ฝากซื้อ' : item.runner_name || 'ผู้รับหิ้ว'} · {item.destination || '-'}</Text></View><StatusBadge status={item.order_status} tone={runner ? 'runner' : undefined} /></View><View style={styles.footer}><Text style={styles.date}>{item.updated_at ? new Date(item.updated_at).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-'}</Text><Text style={[styles.fee, { color: accent }]}>฿{Number(item.fee || 0)}</Text></View></View>} />}
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: 35 }, card: { padding: 14, marginBottom: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, item: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, meta: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }, date: { color: colors.textSecondary, fontSize: 10 }, fee: { fontSize: 13, fontWeight: '900' }, empty: { marginTop: 20, paddingVertical: 55, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 10 }, emptyText: { color: colors.textSecondary, fontSize: 11, marginTop: 4 }, error: { flexDirection: 'row', gap: 10, padding: 11, marginBottom: 10, backgroundColor: '#FFF1F3', borderRadius: 12 }, errorText: { color: colors.danger, flex: 1, fontSize: 10 } });
