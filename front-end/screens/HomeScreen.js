// src/screens/main/HomeScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../AuthContext';
import RoleToggle from '../components/RoleToggle';
import RequesterStack from '../navigation/RequesterStack';
import RunnerStack from '../navigation/RunnerStack';
import { colors, spacing, typography } from '../components/theme';
import { Alert } from 'react-native';

// HomeScreen is the tab root. The RoleToggle switches which nested stack
// navigator renders below it, so each role gets its own header/back-button
// flow (Search -> Place Order for Requester, My Slots -> Create/Dashboard
// for Runner) while staying on the same "Home" tab.
export default function HomeScreen() {
  const { profile, activeRole, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);

  async function handleRoleChange(role) {
    if (role === activeRole) return;
    setSwitching(true);
    try {
      await switchRole(role);
    } catch (err) {
      console.log('❌ switchRole failed:', err.message);
      Alert.alert('Could not switch role', err.message);
    } finally {
      setSwitching(false);
    }
}

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name || 'there'} 👋</Text>
        <Text style={styles.subGreeting}>
          {profile?.dorm_name ? `${profile.dorm_name}${profile.room_number ? ` · Room ${profile.room_number}` : ''}` : ''}
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <RoleToggle activeRole={activeRole} onChange={handleRoleChange} disabled={switching} />
        </View>
      </View>

      <View style={styles.body}>
        {activeRole === 'REQUESTER' ? <RequesterStack /> : <RunnerStack />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  greeting: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subGreeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    flex: 1,
  },
});
