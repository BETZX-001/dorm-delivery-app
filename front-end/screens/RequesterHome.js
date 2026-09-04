// src/screens/main/RequesterHome.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../client';
import { colors, spacing, radii, typography } from '../components/theme';

export default function RequesterHome() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { slots: data } = await api.get('/api/slots/available');
      setSlots(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Available slots in your dorm</Text>
      <FlatList
        data={slots}
        keyExtractor={(item) => String(item.slot_id)}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>No open slots right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.destination}>{item.destination}</Text>
            <Text style={styles.meta}>
              Runner: {item.runner_name} · ⭐ {Number(item.runner_rating).toFixed(1)}
            </Text>
            <Text style={styles.meta}>
              {item.current_orders}/{item.max_orders} orders filled
            </Text>
            <Text style={styles.meta}>
              Cut-off: {new Date(item.cut_off_time).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  destination: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
});
