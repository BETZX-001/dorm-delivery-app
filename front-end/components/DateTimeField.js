// src/components/DateTimeField.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, spacing, radii, typography } from '../components/theme';

export default function DateTimeField({ label, value, onChange, error }) {
  const [showPicker, setShowPicker] = useState(false); // iOS only

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: value || new Date(),
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event, selectedDate) => {
        if (event.type !== 'set' || !selectedDate) return;
        // After picking the date, immediately open the time picker
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== 'set' || !selectedTime) return;
            const combined = new Date(selectedDate);
            combined.setHours(selectedTime.getHours());
            combined.setMinutes(selectedTime.getMinutes());
            onChange(combined);
          },
        });
      },
    });
  }

  function handlePress() {
    if (Platform.OS === 'android') {
      openAndroidPicker();
    } else {
      setShowPicker(true);
    }
  }

  function handleIOSChange(event, selectedDate) {
    if (selectedDate) onChange(selectedDate);
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.valueText}>
          {value ? value.toLocaleString() : 'Select cut-off time'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="datetime"
          display="spinner"
          minimumDate={new Date()}
          onChange={handleIOSChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  valueText: { fontSize: 16, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});