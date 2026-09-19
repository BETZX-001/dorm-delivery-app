import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function registerPushNotifications() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  // Android 13+ only shows the permission prompt after at least one channel
  // exists, so create the channel before requesting notification permission.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'อัปเดตออเดอร์',
      description: 'ออเดอร์ใหม่ การเปลี่ยนสถานะ และข้อความแชท',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF642E',
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error('ไม่พบ EAS projectId สำหรับลงทะเบียนการแจ้งเตือน');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.patch('/api/users/push-token', { push_token: token });
  return token;
}

export function listenForPushTokenChanges() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  return Notifications.addPushTokenListener(({ data }) => {
    if (data) api.patch('/api/users/push-token', { push_token: data }).catch(() => {});
  });
}

export function listenForNotificationResponses(handler) {
  if (Platform.OS === 'web') return null;
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export async function getInitialNotificationResponse() {
  if (Platform.OS === 'web') return null;
  return Notifications.getLastNotificationResponseAsync();
}
