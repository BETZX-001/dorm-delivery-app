// src/components/StarRating.js
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../components/theme';

export default function StarRating({ value, onChange, size = 36 }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= value;
        return (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={`ให้คะแนน ${star} ดาว`}
          onPress={() => onChange(star)}
          style={({ pressed }) => [
            styles.starButton,
            { width: size + 11, height: size + 11, borderRadius: (size + 11) / 2 },
            selected && styles.starButtonSelected,
            pressed && styles.starButtonPressed,
          ]}
        >
          <Ionicons
            name={selected ? 'star' : 'star-outline'}
            size={size}
            color={selected ? colors.secondary : '#B8C2D2'}
          />
        </Pressable>
      );})}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs + 1 },
  starButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E7EF', backgroundColor: colors.white },
  starButtonSelected: { borderColor: '#FFD36A', backgroundColor: '#FFF7DA', shadowColor: '#E7A600', shadowOpacity: .13, shadowRadius: 4, elevation: 2 },
  starButtonPressed: { transform: [{ scale: .88 }], opacity: .78 },
});
