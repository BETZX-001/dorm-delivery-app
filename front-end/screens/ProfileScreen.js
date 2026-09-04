// src/screens/main/ProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, radii, typography } from '../components/theme';

export default function ProfileScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.name}</Text>
        <Text style={styles.meta}>{profile?.email}</Text>
        <Text style={styles.meta}>
          {profile?.dorm_name} {profile?.room_number ? `· Room ${profile.room_number}` : ''}
        </Text>
        <Text style={styles.rating}>⭐ {Number(profile?.avg_rating || 0).toFixed(1)} avg rating</Text>
      </View>

      <PrimaryButton label="Sign Out" variant="secondary" onPress={() => signOut(auth)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  name: { ...typography.h2, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  rating: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
});
