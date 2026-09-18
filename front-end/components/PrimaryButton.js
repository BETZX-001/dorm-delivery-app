// src/components/PrimaryButton.js
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, typography } from '../components/theme';

export default function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', tone = 'requester' }) {
  const isDisabled = disabled || loading;
  const mainColor = tone === 'runner' ? colors.runner : tone === 'danger' ? colors.danger : colors.primary;

  return (
    <Pressable
      android_ripple={{ color: '#FFFFFF44' }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: mainColor },
        variant === 'secondary' && styles.secondary,
        variant === 'secondary' && { borderColor: mainColor },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel, variant === 'secondary' && { color: mainColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.975 }],
    opacity: 0.92,
  },
  label: {
    ...typography.button,
    color: colors.white,
  },
  secondaryLabel: {
    color: colors.primary,
  },
});
