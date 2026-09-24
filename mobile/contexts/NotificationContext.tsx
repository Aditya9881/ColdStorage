/**
 * NotificationContext — ColdStorage Mobile
 *
 * Provides:
 * - Push token registration on login
 * - Token sync with backend
 * - Foreground notification listener
 * - Notification response handler (deep links)
 * - Unread badge count
 */
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import type { EventSubscription, Notification } from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('[Notifications] Failed to load expo-notifications (probably running in Expo Go):', e);
}

if (!Notifications) {
  Notifications = {
    addNotificationReceivedListener: () => ({ remove: () => {} }),
  };
}
import { useAuth } from './AuthContext';
import { api } from '@/lib/api-client';
import {
  registerForPushNotifications,
  setupNotificationResponseHandler,
  clearBadge,
} from '@/lib/notifications';

interface NotificationContextType {
  pushToken: string | null;
  unreadCount: number;
  markAllRead: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  pushToken: null,
  unreadCount: 0,
  markAllRead: () => {},
  hasPermission: false,
  requestPermission: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  // ── Register for push on auth ──
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        setHasPermission(true);

        // Sync token with backend
        try {
          await api.post('/auth/push-token', { token, platform: 'expo' });
        } catch (err) {
          // Backend endpoint may not exist yet — silently ignore
          console.log('[Notifications] Token sync skipped (endpoint not ready)');
        }
      }
    })();
  }, [isAuthenticated]);

  // ── Listen for foreground notifications ──
  useEffect(() => {
    // When notification arrives while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notification) => {
      setUnreadCount(prev => prev + 1);
      console.log('[Notifications] Received:', notification.request.content.title);
    });

    // When user taps a notification
    responseListener.current = setupNotificationResponseHandler();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // ── Clear badge when app comes to foreground ──
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        clearBadge();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const markAllRead = () => {
    setUnreadCount(0);
    clearBadge();
  };

  const requestPermission = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setHasPermission(true);
    }
  };

  return (
    <NotificationContext.Provider value={{
      pushToken,
      unreadCount,
      markAllRead,
      hasPermission,
      requestPermission,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
