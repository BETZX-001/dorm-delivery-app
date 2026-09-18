// src/components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../components/theme';

const STATUS_COLORS = {
  OPEN: colors.success,
  FULL: colors.secondary,
  SHOPPING: colors.primary,
  WAITING: colors.secondary,
  DELIVERING: colors.primary,
  COMPLETED: colors.textSecondary,
  PENDING: colors.secondary,
  ACCEPTED: colors.primary,
  REJECTED: colors.danger,
};

const STATUS_LABELS = {
  OPEN: 'เปิดรับ',
  FULL: 'เต็มแล้ว',
  PENDING: 'รอยืนยัน',
  ACCEPTED: 'รับออร์เดอร์แล้ว',
  SHOPPING: 'กำลังซื้อ',
  WAITING: 'ได้รับของแล้ว',
  DELIVERING: 'กำลังจัดส่ง',
  COMPLETED: 'เสร็จสิ้น',
  REJECTED: 'ปฏิเสธแล้ว',
};

export default function StatusBadge({ status, tone = 'requester' }) {
  const runnerColors = {
    ACCEPTED: colors.runnerDark,
    SHOPPING: colors.runner,
    WAITING: colors.secondary,
    DELIVERING: colors.runner,
  };
  const bg = (tone === 'runner' && runnerColors[status]) || STATUS_COLORS[status] || colors.textSecondary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.text}>{STATUS_LABELS[status] || status}</Text>
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
