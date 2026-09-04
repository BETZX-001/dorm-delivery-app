// src/components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../components/theme';

const STATUS_COLORS = {
  OPEN: colors.success,
  FULL: colors.secondary,
  SHOPPING: colors.primary,
  DELIVERING: colors.primary,
  COMPLETED: colors.textSecondary,
  PENDING: colors.secondary,
  ACCEPTED: colors.primary,
  REJECTED: colors.danger,
};

export default function StatusBadge({ status }) {
  const bg = STATUS_COLORS[status] || colors.textSecondary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 1.5,
    borderRadius: radii.pill,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
});
