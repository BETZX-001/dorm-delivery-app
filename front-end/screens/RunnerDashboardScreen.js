// src/screens/main/RunnerDashboardScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Linking,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

// Sequential forward transitions a Runner can trigger from this screen.
// (REJECTED is only valid from PENDING and is handled by a separate action.)
const NEXT_STATUS = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'SHOPPING',
  SHOPPING: 'WAITING',
  WAITING: 'DELIVERING',
  DELIVERING: 'COMPLETED',
};

const NEXT_LABEL = {
  PENDING: 'รับออร์เดอร์',
  ACCEPTED: 'อัปเดตขั้น 1 · กำลังซื้อของ',
  SHOPPING: 'อัปเดตขั้น 2 · ได้รับของแล้ว',
  WAITING: 'อัปเดตขั้น 3 · กำลังนำไปส่ง',
  DELIVERING: 'ยืนยันส่งสำเร็จ',
};

const STEP_FOR_STATUS = {
  SHOPPING: 1,
  WAITING: 2,
  DELIVERING: 3,
  COMPLETED: 3,
};

const SLOT_STATUS_LABEL = {
  OPEN: 'เปิดรับอยู่',
  FULL: 'เต็มแล้ว',
  SHOPPING: 'กำลังซื้อสินค้า',
  COMPLETED: 'เสร็จสิ้น',
};

export default function RunnerDashboardScreen({ route, navigation }) {
  const { slotId, returnToOrders = false } = route.params;
  const { unreadByOrder, systemRevision } = useAuth();

  const [slot, setSlot] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orderView, setOrderView] = useState(route.params.initialView || 'ACTIVE');
  const backToList = () => returnToOrders ? navigation.goBack() : navigation.popToTop();

  const load = useCallback(async (silent = false) => {
    try {
      const [{ slot: slotData }, { orders: orderData }] = await Promise.all([
        api.get(`/api/slots/${slotId}`),
        api.get(`/api/orders/slot/${slotId}`),
      ]);
      setSlot(slotData);
      setOrders(orderData);
    } catch (err) {
      if (!silent) Alert.alert('Failed to load dashboard', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slotId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const refreshTimer = setInterval(() => load(true), 60_000);
    return () => clearInterval(refreshTimer);
  }, [load]);
  useEffect(() => { if (systemRevision) load(true); }, [systemRevision, load]);

  async function advanceOrder(order) {
    const nextStatus = NEXT_STATUS[order.order_status];
    if (!nextStatus) return;

    setUpdatingId(order.order_id);
    try {
      const { order: updated } = await api.patch(`/api/orders/${order.order_id}/status`, {
        order_status: nextStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o.order_id === updated.order_id ? { ...o, ...updated } : o))
      );
      await load(true);
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function rejectOrder(order) {
    setUpdatingId(order.order_id);
    try {
      const { order: updated } = await api.patch(`/api/orders/${order.order_id}/status`, {
        order_status: 'REJECTED',
      });
      setOrders((prev) =>
        prev.map((o) => (o.order_id === updated.order_id ? { ...o, ...updated } : o))
      );
      await load(true);
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function confirmReject(order) {
    Alert.alert(
      'ปฏิเสธออร์เดอร์?',
      `คุณต้องการปฏิเสธ ${order.item_name} ของ ${order.requester_name} ใช่หรือไม่`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ปฏิเสธ', style: 'destructive', onPress: () => rejectOrder(order) },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  const activeOrders = orders.filter((order) => !['COMPLETED', 'REJECTED'].includes(order.order_status));
  const historyOrders = orders.filter((order) => ['COMPLETED', 'REJECTED'].includes(order.order_status));
  const hasActiveOrders = activeOrders.length > 0;
  const visibleOrders = orderView === 'HISTORY' ? historyOrders : activeOrders;

  useEffect(() => {
    if (!activeOrders.length && historyOrders.length) setOrderView('HISTORY');
  }, [activeOrders.length, historyOrders.length]);

  function deleteSlot() {
    if (hasActiveOrders) {
      return Alert.alert('ลบรอบไม่ได้', 'ยังมีออร์เดอร์ที่กำลังดำเนินการอยู่ในรอบนี้');
    }
    setConfirmingDelete(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/slots/${slotId}`);
      setConfirmingDelete(false);
      backToList();
    } catch (error) {
      Alert.alert('ลบรอบไม่สำเร็จ', error.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={visibleOrders}
      extraData={{ confirmingDelete, deleting, orderView }}
      keyExtractor={(item) => String(item.order_id)}
      ListHeaderComponent={slot && (
        <>
          <Pressable onPress={backToList} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="arrow-back" size={19} color={colors.textPrimary} /><Text style={styles.backText}>{returnToOrders ? 'กลับหน้าออร์เดอร์' : 'กลับหน้าหลัก'}</Text></Pressable>
          <View style={styles.header}>
            <View style={styles.destinationRow}><View style={styles.destinationIcon}><Ionicons name="storefront" color={colors.white} size={20} /></View><View style={{ flex: 1 }}><Text style={styles.destination}>{slot.destination}</Text><Text style={styles.statusText}>รอบรับหิ้วของคุณ · {SLOT_STATUS_LABEL[slot.status] || slot.status}</Text></View></View>
            <View style={styles.summary}><View><Text style={styles.summaryNumber}>{slot.current_orders}/{slot.max_orders}</Text><Text style={styles.summaryLabel}>ออร์เดอร์</Text></View><View><Text style={styles.summaryNumber}>฿{Number(slot.fee || 0)}</Text><Text style={styles.summaryLabel}>ค่าหิ้ว</Text></View><View><Text style={styles.summaryNumber}>{slot.cut_off_time ? new Date(slot.cut_off_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}</Text><Text style={styles.summaryLabel}>ปิดรับ</Text></View></View>
            <View style={styles.manageActions}>
              <Pressable disabled={hasActiveOrders} onPress={() => navigation.navigate('EditSlot', { slot })} style={({ pressed }) => [styles.editButton, hasActiveOrders && styles.actionDisabled, pressed && styles.pressed]}><Ionicons name="create-outline" size={18} color={colors.runnerDark} /><Text style={styles.editText}>แก้ไขเงื่อนไข</Text></Pressable>
              <Pressable disabled={hasActiveOrders} onPress={deleteSlot} style={({ pressed }) => [styles.deleteButton, hasActiveOrders && styles.actionDisabled, pressed && styles.pressed]}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={styles.deleteText}>ลบรอบ</Text></Pressable>
            </View>
            {hasActiveOrders && <Text style={styles.lockedText}>รอบนี้แก้ไขหรือลบไม่ได้จนกว่าออร์เดอร์ทั้งหมดจะเสร็จสิ้น</Text>}
            <View style={styles.ordersTitleRow}><Text style={styles.ordersHeading}>รายการออร์เดอร์</Text><Text style={styles.ordersTotal}>ทั้งหมด {orders.length}</Text></View>
            <View style={styles.orderTabs}>
              <Pressable onPress={() => setOrderView('ACTIVE')} style={[styles.orderTab, orderView === 'ACTIVE' && styles.orderTabActive]}><Ionicons name="pulse-outline" size={15} color={orderView === 'ACTIVE' ? colors.white : colors.textSecondary} /><Text style={[styles.orderTabText, orderView === 'ACTIVE' && styles.orderTabTextActive]}>กำลังดำเนินการ ({activeOrders.length})</Text></Pressable>
              <Pressable onPress={() => setOrderView('HISTORY')} style={[styles.orderTab, orderView === 'HISTORY' && styles.orderTabActive]}><Ionicons name="time-outline" size={15} color={orderView === 'HISTORY' ? colors.white : colors.textSecondary} /><Text style={[styles.orderTabText, orderView === 'HISTORY' && styles.orderTabTextActive]}>ประวัติ ({historyOrders.length})</Text></Pressable>
            </View>
          </View>
        </>
      )}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyEmoji}>{orderView === 'HISTORY' ? '🕘' : '✅'}</Text><Text style={styles.emptyTitle}>{orderView === 'HISTORY' ? 'ยังไม่มีประวัติออเดอร์' : 'ไม่มีออเดอร์ที่กำลังดำเนินการ'}</Text><Text style={styles.emptyText}>{orderView === 'HISTORY' ? 'ออเดอร์ที่เสร็จสิ้นหรือถูกปฏิเสธจะแสดงที่นี่' : 'เมื่อมีออเดอร์ใหม่ รายการจะปรากฏที่นี่อัตโนมัติ'}</Text></View>}
      renderItem={({ item }) => {
        const unread = Number(unreadByOrder[String(item.order_id)] || 0);
        const isUpdating = updatingId === item.order_id;
        const nextLabel = NEXT_LABEL[item.order_status];
        const currentStep = STEP_FOR_STATUS[item.order_status] || 0;

        return (
          <View style={[styles.card, ['COMPLETED', 'REJECTED'].includes(item.order_status) && styles.historyCard]}>
            <View style={styles.cardHeader}>
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('PublicProfile', { userId: item.requester_id, viewRole: 'REQUESTER', initialProfile: { name: item.requester_name, profile_image: item.requester_profile_image } })} style={({ pressed }) => [styles.requesterProfileLink, pressed && styles.pressed]}>
                <View style={styles.requesterAvatar}>{item.requester_profile_image ? <Image source={{ uri: item.requester_profile_image }} style={styles.requesterAvatarImage} /> : <Ionicons name="person-outline" size={19} color={colors.runner} />}</View>
                <View style={styles.requesterCopy}><Text style={styles.requesterName}>{item.requester_name}</Text><Text style={styles.requesterHint}>ผู้ฝากหิ้ว · ออร์เดอร์ #{String(item.order_id).padStart(4, '0')}</Text><Text style={styles.viewProfileText}>ดูโปรไฟล์และประวัติ ›</Text></View>
              </Pressable>
              <StatusBadge status={item.order_status} tone="runner" />
            </View>

            <View style={styles.deliveryAddress}>
              <View style={styles.addressIcon}><Ionicons name="location" size={18} color={colors.runner} /></View>
              <View style={{ flex: 1 }}><Text style={styles.addressLabel}>จุดส่ง</Text><Text style={styles.addressValue}>{item.dorm_name || 'ไม่ระบุหอพัก'}{item.room_number ? ` · ห้อง ${item.room_number}` : ''}</Text></View>
            </View>

            <View style={styles.orderItems}>
              <View style={styles.orderItemsTitle}><Ionicons name="bag-handle-outline" size={16} color={colors.runnerDark} /><Text style={styles.orderItemsLabel}>รายการฝากซื้อ</Text></View>
              <Text style={styles.itemName}>{item.item_name}{Number(item.quantity) > 1 ? ` × ${item.quantity}` : ''}</Text>
            </View>
            {item.note ? <View style={styles.noteBox}><Ionicons name="document-text-outline" size={15} color={colors.secondary} /><Text style={styles.note}>หมายเหตุ: {item.note}</Text></View> : null}

            {!['PENDING', 'REJECTED'].includes(item.order_status) && (
              <View style={styles.progress}>
                {[1, 2, 3].map((step) => (
                  <View key={step} style={styles.progressItem}>
                    <View style={[styles.stepDot, step <= currentStep && styles.stepDotActive]}>
                      <Text style={[styles.stepNumber, step <= currentStep && styles.stepNumberActive]}>{step}</Text>
                    </View>
                    <Text style={[styles.stepText, step === currentStep && styles.stepTextActive]}>
                      {step === 1 ? 'ซื้อของ' : step === 2 ? 'ได้รับของ' : 'นำไปส่ง'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!['COMPLETED', 'REJECTED'].includes(item.order_status) ? (
              <View style={styles.contactCard}>
                <View style={styles.contactIcon}><Ionicons name="people" size={19} color={colors.white} /></View>
                <View style={styles.contactCopy}><Text style={styles.contactLabel}>ติดต่อผู้ฝากหิ้ว</Text><Text style={styles.contactPhone}>{item.requester_phone ? 'พร้อมแชทและโทรติดต่อ' : 'พร้อมแชท · ไม่มีเบอร์โทร'}</Text></View>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Chat', { order: item })} style={({ pressed }) => [styles.chatButton, pressed && styles.pressed]}>
                  <Ionicons name="chatbubble-ellipses" size={17} color={colors.white} />
                  <Text style={styles.chatButtonText}>แชท</Text>
                  {unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text></View>}
                </Pressable>
                {!!item.requester_phone && <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${String(item.requester_phone).replace(/[^\d+]/g, '')}`)} style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}><Ionicons name="call-outline" size={17} color={colors.white} /><Text style={styles.callButtonText}>โทร</Text></Pressable>}
              </View>
            ) : <View style={styles.closedContact}><Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} /><Text style={styles.closedContactText}>ออร์เดอร์สิ้นสุดแล้ว · ปิดการแชทและโทร</Text></View>}

            {nextLabel && (
              <View style={styles.actions}>
                <PrimaryButton
                  label={nextLabel}
                  onPress={() => advanceOrder(item)}
                  loading={isUpdating}
                  tone="runner"
                />
                {item.order_status === 'PENDING' && (
                  <View style={{ marginTop: spacing.sm }}>
                    <PrimaryButton
                      label="ปฏิเสธออร์เดอร์"
                      variant="secondary"
                      tone="danger"
                      onPress={() => confirmReject(item)}
                      disabled={isUpdating}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        );
      }}
      ListFooterComponent={
        <Modal visible={confirmingDelete} transparent animationType="fade" onRequestClose={() => setConfirmingDelete(false)}>
          <View style={styles.modalShade}>
            <View style={styles.confirmCard}>
              <View style={styles.warningIcon}><Ionicons name="trash-outline" size={25} color={colors.danger} /></View>
              <Text style={styles.confirmTitle}>ยืนยันการลบรอบ?</Text>
              <Text style={styles.confirmMessage}>การลบรอบและประวัติออร์เดอร์ที่เสร็จสิ้นแล้วจะไม่สามารถกู้คืนได้</Text>
              <View style={styles.confirmActions}>
                <Pressable disabled={deleting} onPress={() => setConfirmingDelete(false)} style={styles.cancelDelete}><Text style={styles.cancelDeleteText}>ยกเลิก</Text></Pressable>
                <Pressable disabled={deleting} onPress={confirmDelete} style={({ pressed }) => [styles.confirmDelete, deleting && styles.actionDisabled, pressed && !deleting && styles.pressed]}><Text style={styles.confirmDeleteText}>{deleting ? 'กำลังลบ...' : 'ลบรอบ'}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 36 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 11, backgroundColor: colors.surface, marginBottom: 14 },
  backText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  header: { backgroundColor: colors.surface, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  destinationIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.runner, alignItems: 'center', justifyContent: 'center' },
  destination: { ...typography.h2, color: colors.textPrimary, fontSize: 21 },
  statusText: { color: colors.runnerDark, fontSize: 12, fontWeight: '700', marginTop: 2 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.softGreen, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, marginTop: 16 },
  summaryNumber: { color: colors.runnerDark, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  summaryLabel: { color: colors.runnerDark, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  manageActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editButton: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  editText: { color: colors.runnerDark, fontSize: 12, fontWeight: '900' },
  deleteButton: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#FFECEE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  deleteText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  actionDisabled: { opacity: 0.45 },
  lockedText: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: 'center' },
  ordersTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21 },
  ordersHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  ordersTotal: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
  orderTabs: { flexDirection: 'row', gap: 7, marginTop: 11, padding: 4, borderRadius: 13, backgroundColor: colors.background },
  orderTab: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10 },
  orderTabActive: { backgroundColor: colors.runner },
  orderTabText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  orderTabTextActive: { color: colors.white },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
  note: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 45, paddingHorizontal: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18 },
  emptyEmoji: { fontSize: 33 },
  emptyTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 17, marginTop: 8 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 15,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#DDECE4',
    shadowColor: '#3D6650',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
  },
  historyCard: { borderColor: colors.border, shadowOpacity: 0.03 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterAvatar: { width: 40, height: 40, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen, marginRight: 10 }, requesterAvatarImage: { width: 40, height: 40 },
  requesterCopy: { flex: 1 },
  requesterProfileLink: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8, paddingVertical: 3, borderRadius: 12 },
  requesterName: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  requesterHint: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  viewProfileText: { color: colors.runner, fontSize: 9, fontWeight: '900', marginTop: 3 },
  deliveryAddress: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 13, backgroundColor: colors.softGreen },
  addressIcon: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  addressLabel: { color: colors.runnerDark, fontSize: 10, fontWeight: '800' },
  addressValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 1 },
  orderItems: { marginTop: 10, padding: 12, borderRadius: 13, backgroundColor: colors.background },
  orderItemsTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  orderItemsLabel: { color: colors.runnerDark, fontSize: 11, fontWeight: '900' },
  itemName: { ...typography.body, fontSize: 13, lineHeight: 20, fontWeight: '700', color: colors.textPrimary },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 9, padding: 10, borderRadius: 11, backgroundColor: '#FFF9E7' },
  note: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: colors.contactBorder, backgroundColor: colors.contactSoft },
  contactIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.contact },
  contactCopy: { flex: 1 },
  contactLabel: { color: '#52736F', fontSize: 10, fontWeight: '700' },
  contactPhone: { color: colors.contactDark, fontSize: 14, fontWeight: '900', marginTop: 2 },
  callButton: { height: 36, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.contact },
  chatButton: { minWidth: 69, height: 38, paddingHorizontal: 11, borderRadius: 12, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.runnerDark, backgroundColor: colors.runner, shadowColor: colors.runnerDark, shadowOpacity: .18, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  chatButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  unreadBadge: { position: 'absolute', right: -7, top: -8, minWidth: 21, height: 21, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04452', borderWidth: 2, borderColor: colors.white },
  unreadBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  callButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  closedContact: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 11, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted }, closedContactText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  actions: { marginTop: spacing.md },
  progress: { flexDirection: 'row', marginTop: spacing.md, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background },
  progressItem: { flex: 1, alignItems: 'center' },
  stepDot: { width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  stepDotActive: { backgroundColor: colors.runner },
  stepNumber: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  stepNumberActive: { color: colors.white },
  stepText: { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
  stepTextActive: { color: colors.runnerDark, fontWeight: '900' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  modalShade: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  confirmCard: { width: '100%', maxWidth: 390, borderRadius: 20, padding: 22, backgroundColor: colors.surface, alignItems: 'center' },
  warningIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFECEE', alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', marginTop: 12 },
  confirmMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  confirmActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 21 },
  cancelDelete: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: colors.background },
  confirmDelete: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, backgroundColor: colors.danger },
  cancelDeleteText: { color: colors.textSecondary, fontWeight: '900' },
  confirmDeleteText: { color: colors.white, fontWeight: '900' },
});
