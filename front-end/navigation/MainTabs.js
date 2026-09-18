// src/navigation/MainTabs.js
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStack from './HomeStack';
import OrdersStack from './OrdersStack';
import ProfileStack from './ProfileStack';
import AdminScreen from '../screens/AdminScreen';
import { colors } from '../components/theme';
import { useAuth } from '../AuthContext';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: ['home-outline', 'home'],
  Orders: ['receipt-outline', 'receipt'],
  Admin: ['shield-checkmark-outline', 'shield-checkmark'],
  Profile: ['person-outline', 'person'],
};

const ADMIN_COLOR = '#182B57';

function TabIcon({ routeName, focused, color, accent }) {
  const icons = ICONS[routeName] || ['apps-outline', 'apps'];
  return (
    <View style={styles.iconArea}>
      <View style={[styles.iconTile, focused && { backgroundColor: accent, borderColor: accent }]}>
        <Ionicons name={focused ? icons[1] : icons[0]} size={routeName === 'Admin' ? 21 : 22} color={focused ? colors.white : color} />
        {routeName === 'Admin' && (
          <View style={[styles.adminSeal, focused && styles.adminSealActive]}>
            <Ionicons name="settings-sharp" size={7} color={focused ? ADMIN_COLOR : colors.white} />
          </View>
        )}
      </View>
      {focused && <View style={[styles.activeMarker, { backgroundColor: accent }]} />}
    </View>
  );
}

export default function MainTabs() {
  const { isAdmin, activeRole, unreadTotal } = useAuth();
  const activeTint = activeRole === 'RUNNER' ? colors.runner : colors.primary;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const accent = route.name === 'Admin' ? ADMIN_COLOR : activeTint;
        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: '#98A4B8',
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIconStyle: styles.tabIconStyle,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon routeName={route.name} focused={focused} color={color} accent={accent} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'หน้าหลัก' }} />
      <Tab.Screen
        name="Orders"
        component={OrdersStack}
        options={{
          title: 'ออเดอร์ของฉัน',
          tabBarBadge: unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : unreadTotal) : undefined,
          tabBarBadgeStyle: styles.unreadBadge,
        }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('Orders', { screen: 'OrdersList' });
          },
        })}
      />
      {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'จัดการ' }} />}
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'โปรไฟล์' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    backgroundColor: colors.white,
    shadowColor: '#172A50',
    shadowOpacity: 0.1,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: -5 },
    elevation: 12,
  },
  tabItem: {
    borderRadius: 16,
    marginHorizontal: 2,
    paddingTop: 1,
  },
  tabLabel: {
    fontWeight: '900',
    fontSize: 10,
    marginTop: 2,
  },
  tabIconStyle: {
    marginTop: 0,
  },
  iconArea: {
    width: 54,
    height: 39,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconTile: {
    width: 38,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F5F7FA',
  },
  activeMarker: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  adminSeal: {
    position: 'absolute',
    right: -3,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: ADMIN_COLOR,
  },
  adminSealActive: {
    backgroundColor: colors.white,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    backgroundColor: '#F04452',
  },
});
