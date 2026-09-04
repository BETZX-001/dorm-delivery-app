// src/screens/main/ReviewScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { api } from '../client';
import StarRating from '../components/StarRating';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

export default function ReviewScreen({ route, navigation }) {
  const { order } = route.params; // { order_id, item_name, destination, ... }

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating < 1) {
      setError('Please select a star rating');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { runner_new_avg_rating } = await api.post('/api/reviews', {
        order_id: order.order_id,
        rating_score: rating,
        comment: comment || null,
      });

      Alert.alert(
        'Thanks for your feedback!',
        `Runner's rating is now ${Number(runner_new_avg_rating).toFixed(1)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Could not submit review', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.orderCard}>
        <Text style={styles.itemName}>{order.item_name}</Text>
        {order.destination ? <Text style={styles.meta}>{order.destination}</Text> : null}
      </View>

      <Text style={styles.prompt}>How was your delivery?</Text>
      <StarRating value={rating} onChange={setRating} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormInput
        label="Comment (optional)"
        placeholder="Tell the runner how it went..."
        value={comment}
        onChangeText={setComment}
        multiline
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      <PrimaryButton label="Submit Review" onPress={handleSubmit} loading={submitting} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  itemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs / 2 },
  prompt: {
    ...typography.h2,
    fontSize: 18,
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
