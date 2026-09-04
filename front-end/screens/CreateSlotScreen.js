// src/screens/main/CreateSlotScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api } from '../client';
import FormInput from '../components/FormInput';
import DateTimeField from '../components/DateTimeField';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, typography } from '../components/theme';

export default function CreateSlotScreen({ navigation }) {
  const [destination, setDestination] = useState('');
  const [fee, setFee] = useState('');
  const [maxOrders, setMaxOrders] = useState('5');
  const [cutOffTime, setCutOffTime] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!destination) next.destination = 'Destination is required';
    if (!maxOrders || Number(maxOrders) < 1) next.maxOrders = 'Must be at least 1';
    if (fee && Number(fee) < 0) next.fee = 'Fee cannot be negative';
    if (!cutOffTime) next.cutOffTime = 'Cut-off time is required';
    else if (cutOffTime <= new Date()) next.cutOffTime = 'Cut-off time must be in the future';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { slot } = await api.post('/api/slots', {
        destination,
        cut_off_time: cutOffTime.toISOString(),
        max_orders: Number(maxOrders),
        fee: fee ? Number(fee) : 0,
      });

      Alert.alert('Slot created', `Your slot to "${slot.destination}" is now open.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Failed to create slot', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a Delivery Slot</Text>
      <Text style={styles.subtitle}>
        Requesters in your dorm will see this slot until the cut-off time.
      </Text>

      <FormInput
        label="Destination"
        placeholder="e.g. 7-Eleven, Central Market"
        value={destination}
        onChangeText={setDestination}
        error={errors.destination}
      />

      <FormInput
        label="Delivery Fee (THB, per order)"
        placeholder="e.g. 20"
        keyboardType="decimal-pad"
        value={fee}
        onChangeText={setFee}
        error={errors.fee}
      />

      <FormInput
        label="Max Orders"
        placeholder="5"
        keyboardType="number-pad"
        value={maxOrders}
        onChangeText={setMaxOrders}
        error={errors.maxOrders}
      />

      <DateTimeField
        label="Cut-off Time"
        value={cutOffTime}
        onChange={setCutOffTime}
        error={errors.cutOffTime}
      />

      <PrimaryButton label="Create Slot" onPress={handleCreate} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
