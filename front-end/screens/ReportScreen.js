// src/screens/main/ReportScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { api } from '../client';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

const CATEGORIES = [
  { value: 'LATE_DELIVERY', label: 'Late Delivery' },
  { value: 'ITEM_ISSUE', label: 'Item Issue' },
  { value: 'PAYMENT_DISPUTE', label: 'Payment Dispute' },
  { value: 'BEHAVIOR', label: 'Behavior' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReportScreen({ route, navigation }) {
  const orderId = route?.params?.order_id || null;

  const [category, setCategory] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/api/reports', {
        order_id: orderId,
        category,
        description: description.trim(),
      });

      Alert.alert('Report submitted', 'Thanks — our team will look into this.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Could not submit report', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Report an Issue</Text>
      <Text style={styles.subtitle}>
        {orderId ? `Regarding order #${orderId}` : 'Tell us what went wrong'}
      </Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((c) => {
          const isActive = category === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setCategory(c.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FormInput
        label="Description"
        placeholder="Describe what happened..."
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 120, textAlignVertical: 'top' }}
        error={error}
      />

      <PrimaryButton label="Submit Report" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.h1, fontSize: 24, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: { ...typography.caption, color: colors.textSecondary },
  chipLabelActive: { color: colors.white, fontWeight: '600' },
});
