import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing, radii, typography } from '../components/theme';

const STEPS = [
  ['bag-handle-outline', 'กำลังซื้อของ'],
  ['checkmark-done-outline', 'ได้รับของแล้ว'],
  ['walk-outline', 'กำลังนำของไปส่ง'],
];

const STEP_INDEX = {
  PENDING: -1,
  ACCEPTED: -1,
  SHOPPING: 0,
  WAITING: 1,
  DELIVERING: 2,
  COMPLETED: 2,
  REJECTED: -1,
};

const MESSAGE = {
  PENDING: 'รอผู้รับหิ้วตอบรับออร์เดอร์',
  ACCEPTED: 'ผู้รับหิ้วรับออร์เดอร์แล้ว รอเริ่มซื้อของ',
  REJECTED: 'ผู้รับหิ้วปฏิเสธออร์เดอร์นี้',
  COMPLETED: 'ส่งออร์เดอร์สำเร็จแล้ว',
};

export default function TrackingScreen({ route, navigation }) {
  const { unreadByOrder, systemRevision } = useAuth();
  const initialOrder = route.params.order;
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    try {
      const { order: latest } = await api.get(`/api/orders/${initialOrder.order_id}`);
      setOrder(latest);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [initialOrder.order_id]);

  useEffect(() => {
    load(true);
    if (['COMPLETED', 'REJECTED'].includes(order.order_status)) return undefined;
    const timer = setInterval(() => load(true), 60_000);
    return () => clearInterval(timer);
  }, [load, order.order_status]);
  useEffect(() => { if (systemRevision) load(true); }, [systemRevision, load]);

  const current = STEP_INDEX[order.order_status] ?? -1;
  const finalState = ['COMPLETED', 'REJECTED'].includes(order.order_status);
  const unread = Number(unreadByOrder[String(order.order_id)] || 0);

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ติดตามออร์เดอร์</Text>
          <Text style={styles.subtitle}>
            ออร์เดอร์ #{String(order.order_id).padStart(4, '0')} · {order.destination}
          </Text>
        </View>
        <StatusBadge status={order.order_status} />
      </View>

      {MESSAGE[order.order_status] && (
        <View style={[styles.message, order.order_status === 'REJECTED' && styles.rejectedMessage]}>
          <Ionicons
            name={order.order_status === 'REJECTED' ? 'close-circle-outline' : finalState ? 'checkmark-circle-outline' : 'time-outline'}
            size={18}
            color={order.order_status === 'REJECTED' ? colors.danger : colors.primary}
          />
          <Text style={[styles.messageText, order.order_status === 'REJECTED' && styles.rejectedText]}>
            {MESSAGE[order.order_status]}
          </Text>
        </View>
      )}

      <View style={styles.steps}>
        {STEPS.map(([icon, label], index) => {
          const active = index <= current;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.stepIcon, active && styles.stepActive]}>
                <Ionicons name={icon} size={21} color={active ? colors.white : colors.textSecondary} />
              </View>
              <Text style={styles.stepNumber}>ขั้น {index + 1}</Text>
              <Text style={[styles.stepLabel, index === current && styles.stepLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.runner}>
        <View style={styles.avatar}>{order.runner_profile_image ? <Image source={{ uri: order.runner_profile_image }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(order.runner_name || 'ม')[0]}</Text>}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.runnerName}>{order.runner_name || 'ผู้รับหิ้ว'}</Text>
          <Text style={styles.meta}>ผู้รับหิ้ว · ★ {Number(order.runner_rating || 0).toFixed(1)}</Text>
        </View>
      </View>

      {!finalState ? <View style={styles.contactActions}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Chat', { order })} style={({ pressed }) => [styles.contactButton, styles.chatButton, pressed && styles.contactPressed]}>
          <Ionicons name="chatbubble-ellipses" size={19} color={colors.primary} /><Text style={styles.chatText}>แชท</Text>
          {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!order.runner_phone} onPress={() => order.runner_phone && Linking.openURL(`tel:${String(order.runner_phone).replace(/[^\d+]/g, '')}`)} style={({ pressed }) => [styles.contactButton, styles.callButton, !order.runner_phone && styles.disabled, pressed && order.runner_phone && styles.contactPressed]}><Ionicons name="call" size={18} color={colors.white} /><Text style={styles.callText}>{order.runner_phone ? 'โทร' : 'ไม่มีเบอร์'}</Text></Pressable>
      </View> : <View style={styles.contactClosed}><Ionicons name="lock-closed-outline" size={17} color={colors.textSecondary} /><View><Text style={styles.contactClosedTitle}>สิ้นสุดช่องทางติดต่อแล้ว</Text><Text style={styles.contactClosedText}>ไม่สามารถแชทหรือโทรได้หลังออร์เดอร์สิ้นสุด</Text></View></View>}

      <Text style={styles.section}>รายการสินค้า</Text>
      <View style={styles.item}>
        <Ionicons name="cube-outline" size={18} color={colors.primary} />
        <Text style={styles.itemText}>{order.item_name} × {order.quantity}</Text>
      </View>
      <View style={styles.total}><Text>ค่าหิ้ว</Text><Text style={styles.totalValue}>฿{Number(order.fee || 0)}</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: spacing.lg, backgroundColor: colors.background },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { ...typography.h2, fontSize: 24, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.softOrange },
  messageText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '800' },
  rejectedMessage: { backgroundColor: '#FFF0F2' },
  rejectedText: { color: colors.danger },
  steps: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 18, marginTop: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  step: { width: '30%', alignItems: 'center' },
  stepIcon: { width: 45, height: 45, borderRadius: 23, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: colors.primary },
  stepNumber: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', marginTop: 7 },
  stepLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  stepLabelActive: { color: colors.primary, fontWeight: '900' },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  runner: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 18, padding: 15, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 43, height: 43, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4586F5' }, avatarImage: { width: 43, height: 43 },
  avatarText: { color: colors.white, fontWeight: '900' },
  runnerName: { color: colors.textPrimary, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  section: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 22, marginBottom: 9 },
  item: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 13, borderWidth: 1, borderColor: colors.border },
  itemText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderColor: colors.border, color: colors.textPrimary },
  totalValue: { color: colors.primary, fontWeight: '900' },
  contactActions: { flexDirection: 'row', gap: 10, marginTop: 11 },
  contactButton: { flex: 1, minHeight: 50, borderRadius: 14, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', position: 'relative', shadowColor: '#C93C13', shadowOpacity: .16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  chatButton: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.softOrange },
  callButton: { backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.primary },
  chatText: { color: colors.primary, fontWeight: '900', fontSize: 14 }, callText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  contactPressed: { opacity: .78, transform: [{ scale: .97 }] },
  unreadBadge: { position: 'absolute', right: 10, top: -7, minWidth: 21, height: 21, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04452', borderWidth: 2, borderColor: colors.white },
  unreadBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  contactClosed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 54, marginTop: 11, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted }, contactClosedTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, contactClosedText: { color: colors.textSecondary, fontSize: 9, marginTop: 2 },
  disabled: { opacity: .45 },
});
