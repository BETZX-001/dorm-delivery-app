import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import { colors, spacing } from '../components/theme';

const STATUS = { PENDING: 'รอตอบรับ', ACCEPTED: 'รับออร์เดอร์แล้ว', SHOPPING: 'กำลังซื้อ', WAITING: 'ได้รับของแล้ว', DELIVERING: 'กำลังนำส่ง' };

export default function PublicProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { systemRevision } = useAuth();
  const userId = route.params.userId;
  const requesterView = route.params.viewRole === 'REQUESTER';
  const [data, setData] = useState(route.params.initialProfile ? { profile: route.params.initialProfile } : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    try { setData(await api.get(`/api/users/${userId}/public`)); setError(null); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (systemRevision) load(); }, [systemRevision, load]);

  const profile = data?.profile || {};
  const stats = data?.stats || {};
  const currentOrders = requesterView ? data?.current_requester_orders || [] : data?.current_orders || [];
  const accent = requesterView ? colors.primary : colors.runner;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={[styles.hero, { paddingTop: Math.max(insets.top + 10, 26), backgroundColor: accent }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={19} color={requesterView ? colors.primaryDark : colors.runnerDark} /><Text style={[styles.backText, requesterView && { color: colors.primaryDark }]}>กลับ</Text></Pressable>
      <View style={styles.avatar}>{profile.profile_image ? <Image source={{ uri: profile.profile_image }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(profile.name || 'ร')[0]}</Text>}</View>
      <Text style={styles.name}>{profile.name || 'ผู้รับหิ้ว'}</Text>
      <View style={styles.rating}><Ionicons name="star" size={16} color="#FFB800" /><Text style={styles.ratingText}>{Number(profile.avg_rating || 0).toFixed(1)} คะแนน</Text><Text style={styles.verified}>ยืนยันตัวตนแล้ว</Text></View>
    </View>
    {loading && !data ? <ActivityIndicator style={{ marginTop: 50 }} color={colors.runner} /> : <View style={styles.body}>
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={load}><Text style={styles.retry}>ลองใหม่</Text></Pressable></View> : null}
      <Text style={styles.sectionTitle}>ภาพรวมประสบการณ์</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Ionicons name="bicycle-outline" size={21} color={colors.runner} /><Text style={styles.statNumber}>{stats.runner_completed || 0}</Text><Text style={styles.statLabel}>รับออร์เดอร์สำเร็จ</Text></View>
        <View style={styles.stat}><Ionicons name="bag-check-outline" size={21} color={colors.primary} /><Text style={styles.statNumber}>{stats.requester_completed || 0}</Text><Text style={styles.statLabel}>ฝากซื้อสำเร็จ</Text></View>
        <View style={styles.stat}><Ionicons name="pulse-outline" size={21} color="#4586F5" /><Text style={styles.statNumber}>{stats.active_runner_orders || 0}</Text><Text style={styles.statLabel}>กำลังดูแล</Text></View>
      </View>
      <Text style={styles.sectionTitle}>{requesterView ? 'ออร์เดอร์ฝากซื้อปัจจุบัน' : 'ออร์เดอร์ที่กำลังดูแล'}</Text>
      {currentOrders.length ? currentOrders.map((order) => <View key={order.order_id} style={[styles.orderCard, requesterView && { borderColor: '#FFD8C9' }]}><View style={[styles.orderIcon, requesterView && { backgroundColor: colors.softOrange }]}><Ionicons name={requesterView ? 'bag-handle-outline' : 'storefront-outline'} size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.orderTitle}>{order.destination}</Text><Text style={styles.orderMeta}>ออร์เดอร์ #{String(order.order_id).padStart(4, '0')}</Text></View><View style={[styles.status, requesterView && { backgroundColor: colors.softOrange }]}><Text style={[styles.statusText, requesterView && { color: colors.primaryDark }]}>{STATUS[order.order_status] || order.order_status}</Text></View></View>) : <View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={28} color={accent} /><Text style={styles.emptyTitle}>{requesterView ? 'ยังไม่มีออร์เดอร์ฝากซื้อปัจจุบัน' : 'ยังไม่มีออร์เดอร์ที่กำลังดูแล'}</Text><Text style={styles.emptyText}>ประวัติส่วนตัวจะแสดงเฉพาะจำนวนรวม เพื่อความเป็นส่วนตัวของผู้ใช้</Text></View>}
    </View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 36 }, hero: { alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: 27, backgroundColor: colors.runner, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, back: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.white }, backText: { color: colors.runnerDark, fontSize: 12, fontWeight: '900' }, avatar: { width: 86, height: 86, borderRadius: 43, marginTop: 5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: colors.white, backgroundColor: 'rgba(255,255,255,.22)' }, avatarImage: { width: 82, height: 82, borderRadius: 41 }, avatarText: { color: colors.white, fontSize: 30, fontWeight: '900' }, name: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 10 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }, ratingText: { color: colors.white, fontSize: 12, fontWeight: '800' }, verified: { marginLeft: 5, color: colors.runnerDark, backgroundColor: colors.white, fontSize: 9, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' }, body: { padding: spacing.md }, sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 7, marginBottom: 10 }, stats: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, minHeight: 105, alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.surface }, statNumber: { color: colors.textPrimary, fontSize: 23, fontWeight: '900', marginTop: 4 }, statLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 }, orderCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: '#D7EDDF', borderRadius: 16, backgroundColor: colors.surface }, orderIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen }, orderTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, orderMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2 }, status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.softGreen }, statusText: { color: colors.runnerDark, fontSize: 9, fontWeight: '900' }, empty: { alignItems: 'center', padding: 25, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface }, emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 7 }, emptyText: { color: colors.textSecondary, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 4 }, error: { flexDirection: 'row', justifyContent: 'space-between', padding: 11, borderRadius: 12, backgroundColor: '#FFF0F2' }, errorText: { color: colors.danger, fontSize: 10 }, retry: { color: colors.runner, fontSize: 10, fontWeight: '900' },
});
