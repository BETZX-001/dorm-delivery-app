// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, typography } from '../components/theme';

const UNIVERSITY_EMAIL_DOMAIN = '@psu.ac.th';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dorm_name: '',
    room_number: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name) next.name = 'Name is required';
    if (!form.email) {
      next.email = 'Email is required';
    } else if (!form.email.trim().toLowerCase().endsWith(UNIVERSITY_EMAIL_DOMAIN)) {
      next.email = `Must be a university email (${UNIVERSITY_EMAIL_DOMAIN})`;
    }
    if (!form.password || form.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    if (!form.dorm_name) next.dorm_name = 'Dorm name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    let createdUser = null;
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      createdUser = cred.user;

      await sendEmailVerification(createdUser);

            // token ยังไม่ verified แน่นอน ณ จุดนี้ ยิง /sync ตอนนี้ไม่มีประโยชน์
      // เก็บข้อมูลไว้ก่อน ให้ AuthContext เป็นคนยิง /sync ให้ตอน verified แล้ว
      await AsyncStorage.setItem(
        'pendingProfile',
        JSON.stringify({
          name: form.name,
          dorm_name: form.dorm_name,
          room_number: form.room_number || null,
        })
      );

      await signOut(auth);

      Alert.alert(
        'Verify your email',
        'We sent a verification link to your email. Please verify, then log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      Alert.alert('Registration failed', mapAuthError(err.code));
      if (createdUser) {
        // best-effort cleanup is left to Firebase console / admin tooling
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Use your university email to get started</Text>

      <FormInput
        label="Full Name"
        placeholder="Jane Doe"
        value={form.name}
        onChangeText={(v) => update('name', v)}
        error={errors.name}
      />
      <FormInput
        label="University Email"
        placeholder="you@psu.ac.th"
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(v) => update('email', v)}
        error={errors.email}
      />
      <FormInput
        label="Password"
        placeholder="At least 6 characters"
        secureTextEntry
        value={form.password}
        onChangeText={(v) => update('password', v)}
        error={errors.password}
      />
      <FormInput
        label="Dorm Name"
        placeholder="e.g. Dorm A"
        value={form.dorm_name}
        onChangeText={(v) => update('dorm_name', v)}
        error={errors.dorm_name}
      />
      <FormInput
        label="Room Number (optional)"
        placeholder="e.g. 305"
        value={form.room_number}
        onChangeText={(v) => update('room_number', v)}
      />

      <PrimaryButton label="Register" onPress={handleRegister} loading={loading} />

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Log in
        </Text>
      </Text>
    </ScrollView>
  );
}

function mapAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/invalid-email':
      return 'That email address is invalid.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});
