// src/screens/main/OrdersScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { api } from '../client';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { orders: data } = await api.get('/api/orders/mine');
      setOrders(data);
    } catch (err) {
      // swallow - empty state below covers it
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      ListHeaderComponent={<Text style={styles.title}>Your Orders</Text>}
      ListEmptyComponent={<Text style={styles.empty}>You haven't placed any orders yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.itemName}>
              {item.item_name} x {item.quantity}
            </Text>
            <StatusBadge status={item.order_status} />
          </View>
          <Text style={styles.meta}>{item.destination}</Text>
          <Text style={styles.meta}>
            Cut-off: {new Date(item.cut_off_time).toLocaleString()}
          </Text>

          {item.order_status === 'COMPLETED' && (
            <View style={styles.actions}>
              <PrimaryButton
                label="Rate this Runner"
                variant="secondary"
                onPress={() => navigation.navigate('Review', { order: item })}
              />
            </View>
          )}

          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label="Report an Issue"
              variant="secondary"
              onPress={() => navigation.navigate('Report', { order_id: item.order_id })}
            />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
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
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
  actions: { marginTop: spacing.md },
});
