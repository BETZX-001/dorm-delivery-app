// src/navigation/RootNavigator.js
import React, { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { getInitialNotificationResponse, listenForNotificationResponses } from '../notificationService';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
//import { colors } from '../components/theme';

export default function RootNavigator() {
  const { initializing, isAuthenticated, switchRole } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const pendingResponse = useRef(null);
  const handledResponseId = useRef(null);

  const openNotification = useCallback(async (response) => {
    const responseId = response?.notification?.request?.identifier;
    if (!response || (responseId && handledResponseId.current === responseId)) return;
    if (!isAuthenticated || !navigationRef.isReady()) {
      pendingResponse.current = response;
      return;
    }
    handledResponseId.current = responseId;
    pendingResponse.current = null;
    const data = response.notification.request.content.data || {};
    if (data.type === 'ORDER_CREATED' && data.slot_id != null) {
      await switchRole('RUNNER');
      navigationRef.navigate('Orders', {
        screen: 'RunnerDashboard',
        params: { slotId: data.slot_id, returnToOrders: true },
      });
      return;
    }
    if (data.type === 'ORDER_STATUS' || data.type === 'CHAT_MESSAGE') {
      if (data.type === 'ORDER_STATUS') await switchRole('REQUESTER');
      navigationRef.navigate('Orders', { screen: 'OrdersList' });
    }
  }, [isAuthenticated, navigationRef, switchRole]);

  useEffect(() => {
    const subscription = listenForNotificationResponses(openNotification);
    getInitialNotificationResponse().then(openNotification).catch(() => {});
    return () => subscription?.remove();
  }, [openNotification]);

  useEffect(() => {
    if (isAuthenticated && pendingResponse.current) openNotification(pendingResponse.current);
  }, [isAuthenticated, openNotification]);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} style={{ flex: 1 }}>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
});
