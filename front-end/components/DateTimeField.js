// src/components/DateTimeField.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, spacing, radii, typography } from '../components/theme';

export default function DateTimeField({ label, value, onChange, error, compact = false, pickerTitle = 'ตั้งเวลาปิดรับออเดอร์', minimumDate = null }) {
  const [showPicker, setShowPicker] = useState(false); // iOS only
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [webError, setWebError] = useState('');

  function openWebPicker() {
    const initial = value || new Date();
    const pad = (number) => String(number).padStart(2, '0');
    setWebDate(`${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
    setWebTime(`${pad(initial.getHours())}:${pad(initial.getMinutes())}`);
    setWebError('');
    setShowPicker(true);
  }

  function saveWebPicker() {
    const match = webDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const rawTime = webTime.trim().replace('.', ':');
    const normalizedTime = /^\d{3,4}$/.test(rawTime)
      ? `${rawTime.slice(0, -2)}:${rawTime.slice(-2)}`
      : rawTime;
    const timeMatch = normalizedTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match || !timeMatch) {
      setWebError('กรุณากรอกวันที่เป็น YYYY-MM-DD และเวลาเป็น HH:MM เช่น 23:00');
      return;
    }
    const next = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(timeMatch[1]), Number(timeMatch[2]));
    if (!Number.isNaN(next.getTime())) {
      if (minimumDate && next < minimumDate) {
        setWebError('เวลาที่เลือกต้องไม่ก่อนเวลาขั้นต่ำที่กำหนด');
        return;
      }
      onChange(next);
      setShowPicker(false);
    } else {
      setWebError('วันหรือเวลาที่กรอกไม่ถูกต้อง');
    }
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: value || new Date(),
      mode: 'date',
      minimumDate: minimumDate || new Date(),
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
            if (minimumDate && combined < minimumDate) return;
            onChange(combined);
          },
        });
      },
    });
  }

  function handlePress() {
    if (Platform.OS === 'android') {
      openAndroidPicker();
    } else if (Platform.OS === 'web') {
      openWebPicker();
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={compact ? 'เลือกเวลาสิ้นสุด' : 'เลือกวันและเวลาปิดรับ'}
        hitSlop={4}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.input,
          compact && styles.compactInput,
          error && styles.inputError,
          pressed && styles.inputPressed,
        ]}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? (compact ? value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : value.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })) : (compact ? 'เลือกเวลา' : 'เลือกวันและเวลาปิดรับ')}
        </Text>
        <View style={styles.pickerIcon}><Ionicons name="time-outline" size={17} color={colors.runner} /></View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' && showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="datetime"
          display="spinner"
          minimumDate={minimumDate || new Date()}
          onChange={handleIOSChange}
        />
      )}
      {Platform.OS === 'web' && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalShade}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <Text style={styles.modalHint}>กรอกวันที่และเวลา เช่น 2026-09-06 และ 19:30</Text>
              <Text style={styles.modalLabel}>วันที่</Text>
              <TextInput value={webDate} onChangeText={setWebDate} placeholder="YYYY-MM-DD" style={styles.modalInput} />
              <Text style={styles.modalLabel}>เวลา</Text>
              <TextInput value={webTime} onChangeText={(text) => { setWebTime(text); setWebError(''); }} placeholder="HH:MM" style={styles.modalInput} />
              {webError ? <Text style={styles.modalError}>{webError}</Text> : null}
              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowPicker(false)} style={styles.cancelButton}><Text style={styles.cancelText}>ยกเลิก</Text></Pressable>
                <Pressable onPress={saveWebPicker} style={styles.confirmButton}><Text style={styles.confirmText}>ตกลง</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  inputPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  inputError: { borderColor: colors.danger },
  compactInput: { height: 48, paddingHorizontal: 12, paddingVertical: 0, justifyContent: 'center' },
  valueText: { fontSize: 16, color: colors.textPrimary },
  placeholderText: { color: colors.textSecondary, fontWeight: '700' },
  pickerIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  modalShade: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: colors.textPrimary },
  modalHint: { fontSize: 12, color: colors.textSecondary, marginTop: 5, marginBottom: 18 },
  modalLabel: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15, color: colors.textPrimary, marginBottom: 13 },
  modalError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: -5, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 4 },
  cancelButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.background },
  confirmButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.runner },
  cancelText: { fontWeight: '800', color: colors.textSecondary },
  confirmText: { fontWeight: '900', color: colors.white },
});
