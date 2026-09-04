// src/screens/main/RunnerHome.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { api } from '../client';
import PrimaryButton from '../components/PrimaryButton';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing, radii, typography } from '../components/theme';

export default function RunnerHome({ navigation }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { slots: data } = await api.get('/api/slots/mine');
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

  return (
    <View>
      <Text style={styles.sectionTitle}>Your delivery slots</Text>

      <PrimaryButton
        label="+ Create New Slot"
        onPress={() => navigation?.navigate?.('CreateSlot')}
      />

      <View style={{ height: spacing.md }} />

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => String(item.slot_id)}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>You haven't created any slots yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate?.('RunnerDashboard', { slotId: item.slot_id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.destination}>{item.destination}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.meta}>
                {item.current_orders}/{item.max_orders} orders
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
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
