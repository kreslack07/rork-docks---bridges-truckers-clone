import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import createContextHook from '@nkzw/create-context-hook';
import { usePersistedQuery } from '@/hooks/usePersistedQuery';
import { logger } from '@/utils/logger';

const NOTIF_PREFS_KEY = 'notification_prefs';
const NOTIF_HISTORY_KEY = 'notification_history';

export interface NotificationPrefs {
  hazardAlerts: boolean;
  routeUpdates: boolean;
  newDocks: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'hazard' | 'route' | 'dock' | 'general';
  timestamp: number;
  read: boolean;
  data?: Record<string, string>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  hazardAlerts: true,
  routeUpdates: true,
  newDocks: false,
};

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    logger.log('[Notifications] Web — push not supported');
    return null;
  }

  try {
    const Notifications = await import('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.log('[Notifications] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.slug;
    if (!projectId) {
      logger.log('[Notifications] No project ID found — push tokens unavailable');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    logger.log('[Notifications] Token:', tokenData.data);
    return tokenData.data;
  } catch (e) {
    logger.log('[Notifications] Registration error:', e);
    return null;
  }
}

export const [NotificationsProvider, useNotifications] = createContextHook(() => {

  const prefsPersisted = usePersistedQuery<NotificationPrefs>({
    key: NOTIF_PREFS_KEY,
    queryKey: ['notificationPrefs'],
    defaultValue: DEFAULT_PREFS,
  });

  const historyPersisted = usePersistedQuery<AppNotification[]>({
    key: NOTIF_HISTORY_KEY,
    queryKey: ['notificationHistory'],
    defaultValue: [],
  });

  const { updateValue: updatePrefsValue } = prefsPersisted;
  const { updateValue: updateHistoryValue } = historyPersisted;

  const [pushToken, setPushToken] = useState<string | null>(null);
  const isRegisteredRef = useRef<boolean>(false);

  const prefs = prefsPersisted.value;
  const shouldRegister = prefs.hazardAlerts || prefs.routeUpdates || prefs.newDocks;

  useEffect(() => {
    if (!isRegisteredRef.current && shouldRegister) {
      isRegisteredRef.current = true;
      void registerForPushNotifications().then(token => {
        if (token) {
          setPushToken(token);
        }
      });
    }
  }, [shouldRegister]);

  const notifSubRef = useRef<{ remove: () => void } | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const updateHistoryRef = useRef(updateHistoryValue);
  updateHistoryRef.current = updateHistoryValue;

  useEffect(() => {
    isMountedRef.current = true;

    if (Platform.OS === 'web') return;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (!isMountedRef.current) return;

        const sub = Notifications.addNotificationReceivedListener(notification => {
          const content = notification.request.content;
          const newNotif: AppNotification = {
            id: `notif_${Date.now()}`,
            title: content.title ?? 'Alert',
            body: content.body ?? '',
            type: (content.data?.type as AppNotification['type']) ?? 'general',
            timestamp: Date.now(),
            read: false,
            data: content.data as Record<string, string> | undefined,
          };
          updateHistoryRef.current(prev => {
            return [newNotif, ...prev].slice(0, 50);
          });
        });
        notifSubRef.current = sub;
      } catch (e) {
        logger.log('[Notifications] Listener error:', e);
      }
    })();

    return () => {
      isMountedRef.current = false;
      notifSubRef.current?.remove();
      notifSubRef.current = null;
    };
  }, []);

  const updatePrefs = useCallback((updates: Partial<NotificationPrefs>) => {
    updatePrefsValue(prev => ({ ...prev, ...updates }));
  }, [updatePrefsValue]);

  const addLocalNotification = useCallback((title: string, body: string, type: AppNotification['type'], data?: Record<string, string>) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title,
      body,
      type,
      timestamp: Date.now(),
      read: false,
      data,
    };
    updateHistoryValue(prev => {
      return [newNotif, ...prev].slice(0, 50);
    });

    if (Platform.OS !== 'web') {
      void (async () => {
        try {
          const Notifications = await import('expo-notifications');
          await Notifications.scheduleNotificationAsync({
            content: { title, body, data: data ?? {} },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              repeats: false,
            },
          });
        } catch (e) {
          logger.log('[Notifications] Schedule error:', e);
        }
      })();
    }
  }, [updateHistoryValue]);

  const markAsRead = useCallback((id: string) => {
    updateHistoryValue(prev => {
      return prev.map(n => n.id === id ? { ...n, read: true } : n);
    });
  }, [updateHistoryValue]);

  const markAllAsRead = useCallback(() => {
    updateHistoryValue(prev => {
      return prev.map(n => ({ ...n, read: true }));
    });
  }, [updateHistoryValue]);

  const clearNotifications = useCallback(() => {
    updateHistoryValue(() => []);
  }, [updateHistoryValue]);

  const unreadCount = useMemo(() => historyPersisted.value.filter(n => !n.read).length, [historyPersisted.value]);

  return useMemo(() => ({
    prefs: prefsPersisted.value,
    notifications: historyPersisted.value,
    unreadCount,
    pushToken,
    updatePrefs,
    addLocalNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  }), [prefsPersisted.value, historyPersisted.value, unreadCount, pushToken, updatePrefs, addLocalNotification, markAsRead, markAllAsRead, clearNotifications]);
});
