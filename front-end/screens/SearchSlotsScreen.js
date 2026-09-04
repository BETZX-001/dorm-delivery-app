// src/screens/main/SearchSlotsScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { api } from '../client';
import { colors, spacing, radii, typography } from '../components/theme';

export default function SearchSlotsScreen({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadSlots = useCallback(async () => {
    setError(null);
    try {
      const { slots: data } = await api.get('/api/slots/available');
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function onRefresh() {
    setRefreshing(true);
    loadSlots();
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      data={slots}
      keyExtractor={(item) => String(item.slot_id)}
      ListHeaderComponent={<Text style={styles.title}>Slots open in your dorm</Text>}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {error ? error : 'No open slots right now. Pull down to refresh.'}
        </Text>
      }
      renderItem={({ item }) => {
        const spotsLeft = item.max_orders - item.current_orders;
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PlaceOrder', { slot: item })}
          >
            <Text style={styles.destination}>{item.destination}</Text>
            <Text style={styles.meta}>
              Runner: {item.runner_name} · ⭐ {Number(item.runner_rating).toFixed(1)}
            </Text>
            <Text style={styles.meta}>{spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left</Text>
            <Text style={styles.meta}>Fee: ฿{Number(item.fee).toFixed(2)}</Text>
            <Text style={styles.meta}>
              Cut-off: {new Date(item.cut_off_time).toLocaleString()}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h2, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  destination: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
  empty: { ...typography.body, color: colors.textSecondary },
});
