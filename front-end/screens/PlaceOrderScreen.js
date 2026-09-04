// src/screens/main/PlaceOrderScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api } from '../client';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

export default function PlaceOrderScreen({ route, navigation }) {
  const { slot } = route.params;

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!itemName) next.itemName = 'Item name is required';
    if (!quantity || Number(quantity) < 1) next.quantity = 'Quantity must be at least 1';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post('/api/orders', {
        slot_id: slot.slot_id,
        item_name: itemName,
        quantity: Number(quantity),
        note: note || null,
      });

      Alert.alert('Order placed', 'Your order has been sent to the runner.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      // Covers the 409 responses from the backend's row-locked capacity/cut-off checks,
      // e.g. "Slot is already full" if someone else filled it milliseconds earlier.
      Alert.alert('Could not place order', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.slotCard}>
        <Text style={styles.destination}>{slot.destination}</Text>
        <Text style={styles.meta}>
          {slot.current_orders}/{slot.max_orders} orders filled
        </Text>
        <Text style={styles.meta}>Fee: ฿{Number(slot.fee).toFixed(2)}</Text>
        <Text style={styles.meta}>Cut-off: {new Date(slot.cut_off_time).toLocaleString()}</Text>
      </View>

      <FormInput
        label="Item Name"
        placeholder="e.g. Iced Americano, large"
        value={itemName}
        onChangeText={setItemName}
        error={errors.itemName}
      />

      <FormInput
        label="Quantity"
        placeholder="1"
        keyboardType="number-pad"
        value={quantity}
        onChangeText={setQuantity}
        error={errors.quantity}
      />

      <FormInput
        label="Note (optional)"
        placeholder="e.g. less sugar, no ice"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <PrimaryButton label="Place Order" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  destination: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
});
