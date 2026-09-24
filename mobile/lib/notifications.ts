/**
 * Push Notification Service — ColdStorage Mobile
 *
 * Handles:
 * - Expo push token registration
 * - Permission management
 * - Local notification scheduling (temperature alerts, order updates)
 * - Notification response handling (deep linking)
 * - Badge management
 */
import type { NotificationResponse } from 'expo-notifications';
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('[Notifications] Failed to load expo-notifications (probably running in Expo Go):', e);
}

if (!Notifications) {
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ status: 'undetermined' }),
    requestPermissionsAsync: async () => ({ status: 'undetermined' }),
    setNotificationChannelAsync: async () => {},
    getExpoPushTokenAsync: async () => ({ data: '' }),
    scheduleNotificationAsync: async () => '',
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    setBadgeCountAsync: async () => {},
    cancelAllScheduledNotificationsAsync: async () => {},
    cancelScheduledNotificationAsync: async () => {},
    AndroidImportance: {
      ZERO: 0,
      MIN: 1,
      LOW: 2,
      DEFAULT: 3,
      HIGH: 4,
      MAX: 5,
    },
    SchedulableTriggerInputTypes: {
      TIME_INTERVAL: 'timeInterval',
      DAILY: 'daily',
      WEEKLY: 'weekly',
      MONTHLY: 'monthly',
      YEARLY: 'yearly',
      DATE: 'date',
    },
  };
}
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { storage } from './storage';

// ── Configure notification behavior ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Types ──
export interface NotificationPayload {
  type: 'TEMP_ALERT' | 'ORDER_UPDATE' | 'PRICE_ALERT' | 'RENT_DUE' | 'SYSTEM' | 'LOT_STATUS';
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ── Token Registration ──
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenData.data;

    // Persist locally
    await storage.setItem('push_token', token);

    console.log('[Notifications] Push token:', token);
    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

// ── Android Notification Channels ──
async function setupAndroidChannels() {
  // Temperature alerts — high priority
  await Notifications.setNotificationChannelAsync('temp-alerts', {
    name: 'Temperature Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#DC2626',
    sound: 'default',
    description: 'Critical temperature alerts for cold storage chambers',
  });

  // Order updates
  await Notifications.setNotificationChannelAsync('order-updates', {
    name: 'Order Updates',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    description: 'Order status changes, bids, and approvals',
  });

  // Price alerts
  await Notifications.setNotificationChannelAsync('price-alerts', {
    name: 'Price Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Mandi price updates and market changes',
  });

  // Rent & billing
  await Notifications.setNotificationChannelAsync('billing', {
    name: 'Billing & Rent',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Storage rent statements and payment reminders',
  });

  // General
  await Notifications.setNotificationChannelAsync('general', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'General updates and announcements',
  });
}

// ── Local Notifications ──

/**
 * Show a local notification immediately
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<string> {
  const channelId = getChannelForType(payload.type);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: null, // Immediate
  });
}

/**
 * Schedule a notification for later
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  delaySeconds: number,
): Promise<string> {
  const channelId = getChannelForType(payload.type);

  return await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: { seconds: delaySeconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

/**
 * Schedule a daily recurring notification (e.g., daily rent reminder)
 */
export async function scheduleDailyNotification(
  payload: NotificationPayload,
  hour: number,
  minute: number,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, type: payload.type },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Notification Response Handler (Deep Linking) ──

export function setupNotificationResponseHandler() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
    const data = response.notification.request.content.data;
    handleNotificationNavigation(data || {});
  });

  return subscription;
}

function handleNotificationNavigation(data: Record<string, any>) {
  const type = data?.type as string;

  switch (type) {
    case 'TEMP_ALERT':
      // Navigate to facility/chamber detail
      if (data.facilityId) {
        router.push(`/facility/${data.facilityId}`);
      }
      break;

    case 'ORDER_UPDATE':
      // Navigate to order detail
      if (data.orderId) {
        router.push(`/orders/${data.orderId}`);
      } else {
        router.push('/orders');
      }
      break;

    case 'PRICE_ALERT':
      router.push('/market-prices');
      break;

    case 'RENT_DUE':
      if (data.facilityId) {
        router.push(`/facility/${data.facilityId}`);
      }
      break;

    case 'LOT_STATUS':
      if (data.lotId) {
        router.push(`/lots/${data.lotId}`);
      }
      break;

    default:
      router.push('/notifications');
      break;
  }
}

// ── Badge Management ──

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge() {
  await Notifications.setBadgeCountAsync(0);
}

// ── Cancel Notifications ──

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// ── Helpers ──

function getChannelForType(type: NotificationPayload['type']): string {
  switch (type) {
    case 'TEMP_ALERT': return 'temp-alerts';
    case 'ORDER_UPDATE': return 'order-updates';
    case 'PRICE_ALERT': return 'price-alerts';
    case 'RENT_DUE': return 'billing';
    default: return 'general';
  }
}

/**
 * Get the stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return await storage.getItem('push_token');
}
