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
} from 'react-native';
import { api } from '../client';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

// Sequential forward transitions a Runner can trigger from this screen.
// (REJECTED is only valid from PENDING and is handled by a separate action.)
const NEXT_STATUS = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'SHOPPING',
  SHOPPING: 'DELIVERING',
  DELIVERING: 'COMPLETED',
};

const NEXT_LABEL = {
  PENDING: 'Accept',
  ACCEPTED: 'Start Shopping',
  SHOPPING: 'Out for Delivery',
  DELIVERING: 'Mark Completed',
};

export default function RunnerDashboardScreen({ route }) {
  const { slotId } = route.params;

  const [slot, setSlot] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ slot: slotData }, { orders: orderData }] = await Promise.all([
        api.get(`/api/slots/${slotId}`),
        api.get(`/api/orders/slot/${slotId}`),
      ]);
      setSlot(slotData);
      setOrders(orderData);
    } catch (err) {
      Alert.alert('Failed to load dashboard', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slotId]);

  useEffect(() => {
    load();
  }, [load]);

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
    } catch (err) {
      Alert.alert('Update failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={orders}
      keyExtractor={(item) => String(item.order_id)}
      ListHeaderComponent={
        slot && (
          <View style={styles.header}>
            <Text style={styles.destination}>{slot.destination}</Text>
            <Text style={styles.meta}>
              {slot.current_orders}/{slot.max_orders} orders · Status: {slot.status}
            </Text>
          </View>
        )
      }
      ListEmptyComponent={<Text style={styles.empty}>No orders on this slot yet.</Text>}
      renderItem={({ item }) => {
        const isUpdating = updatingId === item.order_id;
        const nextLabel = NEXT_LABEL[item.order_status];

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName}>
                {item.item_name} × {item.quantity}
              </Text>
              <StatusBadge status={item.order_status} />
            </View>

            <Text style={styles.meta}>Requester: {item.requester_name}</Text>
            {item.room_number ? <Text style={styles.meta}>Room {item.room_number}</Text> : null}
            {item.note ? <Text style={styles.note}>Note: {item.note}</Text> : null}

            {nextLabel && (
              <View style={styles.actions}>
                <PrimaryButton
                  label={nextLabel}
                  onPress={() => advanceOrder(item)}
                  loading={isUpdating}
                />
                {item.order_status === 'PENDING' && (
                  <View style={{ marginTop: spacing.sm }}>
                    <PrimaryButton
                      label="Reject"
                      variant="secondary"
                      onPress={() => rejectOrder(item)}
                      disabled={isUpdating}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  destination: { ...typography.h2, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
  note: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs, fontStyle: 'italic' },
  empty: { ...typography.body, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  actions: { marginTop: spacing.md },
});
