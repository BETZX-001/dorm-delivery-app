// src/navigation/RunnerStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RunnerHome from '../screens/RunnerHome';
import CreateSlotScreen from '../screens/CreateSlotScreen';
import RunnerDashboardScreen from '../screens/RunnerDashboardScreen';
import { colors } from '../components/theme';

const Stack = createNativeStackNavigator();

export default function RunnerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="RunnerHome"
        component={RunnerHome}
        options={{ title: 'My Slots' }}
      />
      <Stack.Screen
        name="CreateSlot"
        component={CreateSlotScreen}
        options={{ title: 'Create Slot' }}
      />
      <Stack.Screen
        name="RunnerDashboard"
        component={RunnerDashboardScreen}
        options={{ title: 'Manage Orders' }}
      />
    </Stack.Navigator>
  );
}
