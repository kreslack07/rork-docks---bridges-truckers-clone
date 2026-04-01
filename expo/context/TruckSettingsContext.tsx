import { useCallback, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { TruckProfile } from '@/types';
import { usePersistedQuery, usePersistedBoolQuery, usePersistedStringQuery } from '@/hooks/usePersistedQuery';

const TRUCK_PROFILE_KEY = 'truck_profile';
const VOICE_ENABLED_KEY = 'voice_navigation_enabled';
const UNIT_PREFERENCE_KEY = 'unit_preference';
const FLEET_KEY = 'fleet_trucks';
const ACTIVE_TRUCK_KEY = 'fleet_active_truck';

export type UnitSystem = 'metric' | 'imperial';

export interface FleetTruck extends TruckProfile {
  id: string;
  driver?: string;
  notes?: string;
  color: string;
  createdAt: number;
}

const DEFAULT_PROFILE: TruckProfile = {
  name: '',
  height: 4.3,
  weight: 42.5,
  width: 2.5,
  type: 'semi_trailer',
  plateNumber: '',
};

const TRUCK_COLORS = [
  '#F59E0B', '#EF4444', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

export const [TruckSettingsProvider, useTruckSettings] = createContextHook(() => {
  const profilePersisted = usePersistedQuery<TruckProfile>({
    key: TRUCK_PROFILE_KEY,
    queryKey: ['truckProfile'],
    defaultValue: DEFAULT_PROFILE,
  });

  const voicePersisted = usePersistedBoolQuery({
    key: VOICE_ENABLED_KEY,
    queryKey: ['voicePreference'],
    defaultValue: true,
  });

  const unitPersisted = usePersistedQuery<UnitSystem>({
    key: UNIT_PREFERENCE_KEY,
    queryKey: ['unitPreference'],
    defaultValue: 'metric',
    serialize: (v) => v,
    deserialize: (v) => v as UnitSystem,
  });

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

  const { updateValue: updateProfileValue } = profilePersisted;
  const { setValue: setVoiceValue } = voicePersisted;
  const { setValue: setUnitValue } = unitPersisted;
  const { updateValue: updateTrucks } = trucksPersisted;
  const { setValue: setActiveValue, value: activeValue } = activePersisted;

  const updateProfile = useCallback((updates: Partial<TruckProfile>) => {
    updateProfileValue(prev => ({ ...prev, ...updates }));
  }, [updateProfileValue]);

  const updateHeight = useCallback((height: number) => {
    updateProfile({ height });
  }, [updateProfile]);

  const setVoiceEnabled = useCallback((enabled: boolean) => {
    setVoiceValue(enabled);
    console.log('[TruckSettings] Voice navigation:', enabled ? 'enabled' : 'disabled');
  }, [setVoiceValue]);

  const setUnitSystem = useCallback((unit: UnitSystem) => {
    setUnitValue(unit);
    console.log('[TruckSettings] Unit system:', unit);
  }, [setUnitValue]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(!voicePersisted.value);
  }, [voicePersisted.value, setVoiceEnabled]);

  const addTruck = useCallback((truck: Omit<FleetTruck, 'id' | 'createdAt' | 'color'>): FleetTruck => {
    const id = `truck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    let resolvedColor = TRUCK_COLORS[0];

    updateTrucks(prev => {
      resolvedColor = TRUCK_COLORS[prev.length % TRUCK_COLORS.length];
      const newTruck: FleetTruck = {
        ...truck,
        id,
        color: resolvedColor,
        createdAt: now,
      };
      if (prev.length === 0) {
        setActiveValue(id);
      }
      return [...prev, newTruck];
    });

    console.log('[Fleet] Truck added:', id);
    return {
      ...truck,
      id,
      color: resolvedColor,
      createdAt: now,
    };
  }, [updateTrucks, setActiveValue]);

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
    profile: profilePersisted.value,
    updateProfile,
    updateHeight,
    isProfileLoading: profilePersisted.isLoading,
    isProfileSaving: false,
    isVoiceEnabled: voicePersisted.value,
    setVoiceEnabled,
    toggleVoice,
    unitSystem: unitPersisted.value,
    setUnitSystem,
    trucks: trucksPersisted.value,
    activeTruck,
    activeTruckId: activeValue,
    addTruck,
    updateTruck,
    removeTruck,
    setActiveTruck,
    truckCount: trucksPersisted.value.length,
    isFleetLoading: trucksPersisted.isLoading,
  }), [
    profilePersisted.value,
    updateProfile,
    updateHeight,
    profilePersisted.isLoading,
    voicePersisted.value,
    setVoiceEnabled,
    toggleVoice,
    unitPersisted.value,
    setUnitSystem,
    trucksPersisted.value,
    activeTruck,
    activeValue,
    addTruck,
    updateTruck,
    removeTruck,
    setActiveTruck,
    trucksPersisted.isLoading,
  ]);
});

export function useTruckProfile() {
  const { profile, updateProfile, updateHeight, isProfileLoading, isProfileSaving } = useTruckSettings();
  return { profile, updateProfile, updateHeight, isLoading: isProfileLoading, isSaving: isProfileSaving };
}

export function useVoice() {
  const { isVoiceEnabled, setVoiceEnabled, toggleVoice } = useTruckSettings();
  return { isVoiceEnabled, setVoiceEnabled, toggleVoice };
}

export function useUnits() {
  const { unitSystem, setUnitSystem } = useTruckSettings();
  const isMetric = unitSystem === 'metric';
  const isMetricRef = useRef(isMetric);
  isMetricRef.current = isMetric;

  const formatHeight = useCallback((metres: number): string => {
    if (isMetricRef.current) return `${metres.toFixed(1)}m`;
    const totalInches = metres / 0.0254;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }, []);

  const formatWeight = useCallback((tonnes: number): string => {
    if (isMetricRef.current) return `${tonnes.toFixed(1)}t`;
    const lbs = tonnes * 2204.62;
    return lbs >= 1000 ? `${(lbs / 1000).toFixed(1)}k lbs` : `${Math.round(lbs)} lbs`;
  }, []);

  const formatDistance = useCallback((km: number): string => {
    if (isMetricRef.current) return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
    const miles = km * 0.621371;
    return miles < 0.1 ? `${Math.round(miles * 5280)}ft` : `${miles.toFixed(1)}mi`;
  }, []);

  const heightUnit = isMetric ? 'm' : 'ft';
  const weightUnit = isMetric ? 't' : 'lbs';
  const distanceUnit = isMetric ? 'km' : 'mi';

  return useMemo(() => ({
    unitSystem, setUnitSystem, isMetric, formatHeight, formatWeight, formatDistance, heightUnit, weightUnit, distanceUnit,
  }), [unitSystem, setUnitSystem, isMetric, formatHeight, formatWeight, formatDistance, heightUnit, weightUnit, distanceUnit]);
}

export function useFleet() {
  const { trucks, activeTruck, activeTruckId, addTruck, updateTruck, removeTruck, setActiveTruck, truckCount, isFleetLoading } = useTruckSettings();
  return { trucks, activeTruck, activeTruckId, addTruck, updateTruck, removeTruck, setActiveTruck, truckCount, isLoading: isFleetLoading };
}
