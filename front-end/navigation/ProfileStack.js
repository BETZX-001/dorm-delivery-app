import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ReviewHistoryScreen from '../screens/ReviewHistoryScreen';
import ProfileOrderHistoryScreen from '../screens/ProfileOrderHistoryScreen';
import AppIssueScreen from '../screens/AppIssueScreen';
const Stack = createNativeStackNavigator();
export default function ProfileStack() { return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="ProfileHome" component={ProfileScreen} /><Stack.Screen name="EditProfile" component={EditProfileScreen} /><Stack.Screen name="ReviewHistory" component={ReviewHistoryScreen} /><Stack.Screen name="OrderHistory" component={ProfileOrderHistoryScreen} /><Stack.Screen name="AppIssue" component={AppIssueScreen} /></Stack.Navigator>; }
