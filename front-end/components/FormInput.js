// src/components/FormInput.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../components/theme';

export default function FormInput({ label, error, style, ...textInputProps }) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { onFocus, onBlur, secureTextEntry, ...inputProps } = textInputProps;
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, isPassword && styles.passwordInput, focused && styles.inputFocused, focused && isPassword && styles.passwordInputFocused, error && styles.inputError, style]}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          secureTextEntry={isPassword && !passwordVisible}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            accessibilityHint="แตะเพื่อสลับการแสดงรหัสผ่าน"
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.eyePressed]}
          >
            <Ionicons name={passwordVisible ? 'eye-outline' : 'eye-off-outline'} size={21} color={passwordVisible ? colors.primary : colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    fontFamily: typography.body.fontFamily,
    fontWeight: '500',
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordInputFocused: {
    paddingRight: 51,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: spacing.md - 1,
    paddingVertical: spacing.sm + 3,
    backgroundColor: '#FFFDFC',
  },
  inputError: {
    borderColor: colors.danger,
  },
  eyeButton: {
    position: 'absolute',
    right: 6,
    top: 4,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePressed: {
    backgroundColor: '#FFF0E9',
    transform: [{ scale: 0.88 }],
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
