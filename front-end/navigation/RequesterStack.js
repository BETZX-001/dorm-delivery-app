// src/navigation/RequesterStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SearchSlotsScreen from '../screens/SearchSlotsScreen';
import PlaceOrderScreen from '../screens/PlaceOrderScreen';
import { colors } from '../components/theme';

const Stack = createNativeStackNavigator();

export default function RequesterStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen
        name="SearchSlots"
        component={SearchSlotsScreen}
        options={{ title: 'Available Slots' }}
      />
      <Stack.Screen
        name="PlaceOrder"
        component={PlaceOrderScreen}
        options={{ title: 'Place Order' }}
      />
    </Stack.Navigator>
  );
}
