// src/navigation/OrdersStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrdersScreen from '../screens/OrdersScreen';
import ReviewScreen from '../screens/ReviewScreen';
import ReportScreen from '../screens/ReportScreen';
import RunnerDashboardScreen from '../screens/RunnerDashboardScreen';
import EditSlotScreen from '../screens/EditSlotScreen';
import TrackingScreen from '../screens/TrackingScreen';
import ChatScreen from '../screens/ChatScreen';
import { colors } from '../components/theme';
import { useAuth } from '../AuthContext';

const Stack = createNativeStackNavigator();

export default function OrdersStack() {
  const { activeRole } = useAuth();
  const accent = activeRole === 'RUNNER' ? colors.runner : colors.primary;
  return (
    <Stack.Navigator
      key={activeRole}
      screenOptions={{
        headerStyle: { backgroundColor: accent },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '900', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreen}
        options={{ title: activeRole === 'RUNNER' ? 'ออร์เดอร์รับหิ้วของฉัน' : 'ออร์เดอร์ของฉัน' }}
      />
      <Stack.Screen name="RunnerDashboard" component={RunnerDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditSlot" component={EditSlotScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Tracking" component={TrackingScreen} options={{ title: 'ติดตามออร์เดอร์' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'แชทออเดอร์' }} />
    </Stack.Navigator>
  );
}
