// src/components/RoleToggle.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '../components/theme';

export default function RoleToggle({ activeRole, onChange, disabled }) {
  return (
    <View style={styles.container}>
      {['REQUESTER', 'RUNNER'].map((role) => {
        const isActive = activeRole === role;
        return (
          <TouchableOpacity
            key={role}
            style={[styles.option, isActive && styles.optionActive]}
            onPress={() => !disabled && onChange(role)}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {role === 'REQUESTER' ? 'Requester' : 'Runner'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: spacing.xs / 2,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.button,
    fontSize: 14,
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.white,
  },
});
