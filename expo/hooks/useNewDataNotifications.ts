import { useEffect, useRef } from 'react';
import { Dock, Hazard } from '@/types';
import { useNotifications } from '@/context/NotificationsContext';
import { logger } from '@/utils/logger';

export function useNewDataNotifications(allHazards: Hazard[], allDocks: Dock[]) {
  const { addLocalNotification, prefs } = useNotifications();

  const prevHazardIdsRef = useRef<Set<string>>(new Set());
  const prevDockIdsRef = useRef<Set<string>>(new Set());
  const addLocalNotificationRef = useRef(addLocalNotification);
  addLocalNotificationRef.current = addLocalNotification;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    if (!allHazards.length) return;
    const currentIds = new Set(allHazards.map(h => h.id));
    const prevIds = prevHazardIdsRef.current;

    if (prevIds.size > 0 && prefsRef.current.hazardAlerts) {
      const newHazards = allHazards.filter(h => !prevIds.has(h.id));
      if (newHazards.length > 0 && newHazards.length <= 10) {
        const blocked = newHazards.filter(h => h.clearanceHeight < 4.3);
        if (blocked.length > 0) {
          addLocalNotificationRef.current(
            'New Hazards Detected',
            `${blocked.length} new low-clearance hazard${blocked.length !== 1 ? 's' : ''} found nearby: ${blocked.slice(0, 3).map(h => h.name).join(', ')}`,
            'hazard',
          );
          logger.log('[Notifications] Notified about', blocked.length, 'new blocked hazards');
        } else if (newHazards.length > 0) {
          addLocalNotificationRef.current(
            'New Hazards Nearby',
            `${newHazards.length} new hazard${newHazards.length !== 1 ? 's' : ''} detected in your area`,
            'hazard',
          );
          logger.log('[Notifications] Notified about', newHazards.length, 'new hazards');
        }
      }
    }
    prevHazardIdsRef.current = currentIds;
  }, [allHazards]);

  useEffect(() => {
    if (!allDocks.length) return;
    const currentIds = new Set(allDocks.map(d => d.id));
    const prevIds = prevDockIdsRef.current;

    if (prevIds.size > 0 && prefsRef.current.newDocks) {
      const newDocks = allDocks.filter(d => !prevIds.has(d.id));
      if (newDocks.length > 0 && newDocks.length <= 10) {
        addLocalNotificationRef.current(
          'New Docks Nearby',
          `${newDocks.length} new dock${newDocks.length !== 1 ? 's' : ''} found: ${newDocks.slice(0, 3).map(d => d.name).join(', ')}`,
          'dock',
        );
        logger.log('[Notifications] Notified about', newDocks.length, 'new docks');
      }
    }
    prevDockIdsRef.current = currentIds;
  }, [allDocks]);
}
