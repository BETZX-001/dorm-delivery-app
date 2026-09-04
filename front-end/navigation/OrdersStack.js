// src/navigation/OrdersStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrdersScreen from '../screens/OrdersScreen';
import ReviewScreen from '../screens/ReviewScreen';
import ReportScreen from '../screens/ReportScreen';
import { colors } from '../components/theme';

const Stack = createNativeStackNavigator();

export default function OrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Rate Runner' }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report Issue' }} />
    </Stack.Navigator>
  );
}
