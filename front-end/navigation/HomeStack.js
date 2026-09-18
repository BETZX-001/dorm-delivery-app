import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import PlaceOrderScreen from '../screens/PlaceOrderScreen';
import CreateSlotScreen from '../screens/CreateSlotScreen';
import RunnerDashboardScreen from '../screens/RunnerDashboardScreen';
import EditSlotScreen from '../screens/EditSlotScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import { colors } from '../components/theme';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} />
      <Stack.Screen name="CreateSlot" component={CreateSlotScreen} />
      <Stack.Screen name="RunnerDashboard" component={RunnerDashboardScreen} />
      <Stack.Screen name="EditSlot" component={EditSlotScreen} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </Stack.Navigator>
  );
}
