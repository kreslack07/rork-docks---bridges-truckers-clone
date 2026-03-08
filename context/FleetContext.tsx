import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { TruckProfile } from '@/types';
import { usePersistedQuery, usePersistedStringQuery } from '@/hooks/usePersistedQuery';

const FLEET_KEY = 'fleet_trucks';
const ACTIVE_TRUCK_KEY = 'fleet_active_truck';

export interface FleetTruck extends TruckProfile {
  id: string;
  driver?: string;
  notes?: string;
  color: string;
  createdAt: number;
}

const TRUCK_COLORS = [
  '#F59E0B', '#EF4444', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export const [FleetProvider, useFleet] = createContextHook(() => {
  const trucksPersisted = usePersistedQuery<FleetTruck[]>({
    key: FLEET_KEY,
    queryKey: ['fleetTrucks'],
    defaultValue: [],
  });

  const activePersisted = usePersistedStringQuery({
    key: ACTIVE_TRUCK_KEY,
    queryKey: ['activeFleetTruck'],
    defaultValue: null,
  });

  const { updateValue: updateTrucks } = trucksPersisted;
  const { setValue: setActiveValue, value: activeValue } = activePersisted;

  const addTruck = useCallback((truck: Omit<FleetTruck, 'id' | 'createdAt' | 'color'>): FleetTruck => {
    const id = `truck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const currentTrucks = trucksPersisted.value;
    const colorIndex = currentTrucks.length % TRUCK_COLORS.length;
    const resolvedColor = TRUCK_COLORS[colorIndex];

    const newTruck: FleetTruck = {
      ...truck,
      id,
      color: resolvedColor,
      createdAt: now,
    };

    updateTrucks(prev => {
      if (prev.length === 0) {
        setActiveValue(id);
      }
      return [...prev, newTruck];
    });

    console.log('[Fleet] Truck added:', newTruck.id);
    return newTruck;
  }, [updateTrucks, setActiveValue, trucksPersisted.value]);

  const updateTruck = useCallback((id: string, updates: Partial<FleetTruck>) => {
    updateTrucks(prev => {
      return prev.map(t => t.id === id ? { ...t, ...updates } : t);
    });
    console.log('[Fleet] Truck updated:', id);
  }, [updateTrucks]);

  const removeTruck = useCallback((id: string) => {
    updateTrucks(prev => {
      const updated = prev.filter(t => t.id !== id);

      if (activeValue === id) {
        const newActive = updated.length > 0 ? updated[0].id : null;
        setActiveValue(newActive);
      }

      return updated;
    });

    console.log('[Fleet] Truck removed:', id);
  }, [updateTrucks, activeValue, setActiveValue]);

  const setActiveTruck = useCallback((id: string) => {
    setActiveValue(id);
    console.log('[Fleet] Active truck set:', id);
  }, [setActiveValue]);

  const activeTruck = useMemo(() => trucksPersisted.value.find(t => t.id === activeValue) ?? null, [trucksPersisted.value, activeValue]);

  return useMemo(() => ({
    trucks: trucksPersisted.value,
    activeTruck,
    activeTruckId: activeValue,
    addTruck,
    updateTruck,
    removeTruck,
    setActiveTruck,
    truckCount: trucksPersisted.value.length,
    isLoading: trucksPersisted.isLoading,
  }), [trucksPersisted.value, activeTruck, activeValue, addTruck, updateTruck, removeTruck, setActiveTruck, trucksPersisted.isLoading]);
});
