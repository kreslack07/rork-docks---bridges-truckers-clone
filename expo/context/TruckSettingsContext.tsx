import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { TruckProfile } from '@/types';
import { usePersistedQuery, usePersistedBoolQuery } from '@/hooks/usePersistedQuery';

const TRUCK_PROFILE_KEY = 'truck_profile';
const VOICE_ENABLED_KEY = 'voice_navigation_enabled';
const UNIT_PREFERENCE_KEY = 'unit_preference';

export type UnitSystem = 'metric' | 'imperial';

const DEFAULT_PROFILE: TruckProfile = {
  name: '',
  height: 4.3,
  weight: 42.5,
  width: 2.5,
  type: 'semi_trailer',
  plateNumber: '',
};

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

  const { updateValue: updateProfileValue } = profilePersisted;
  const { setValue: setVoiceValue } = voicePersisted;

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

  const { setValue: setUnitValue } = unitPersisted;

  const setUnitSystem = useCallback((unit: UnitSystem) => {
    setUnitValue(unit);
    console.log('[TruckSettings] Unit system:', unit);
  }, [setUnitValue]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(!voicePersisted.value);
  }, [voicePersisted.value, setVoiceEnabled]);

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

  const formatHeight = (metres: number): string => {
    if (isMetric) return `${metres.toFixed(1)}m`;
    const totalInches = metres / 0.0254;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const formatWeight = (tonnes: number): string => {
    if (isMetric) return `${tonnes.toFixed(1)}t`;
    const lbs = tonnes * 2204.62;
    return lbs >= 1000 ? `${(lbs / 1000).toFixed(1)}k lbs` : `${Math.round(lbs)} lbs`;
  };

  const formatDistance = (km: number): string => {
    if (isMetric) return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
    const miles = km * 0.621371;
    return miles < 0.1 ? `${Math.round(miles * 5280)}ft` : `${miles.toFixed(1)}mi`;
  };

  const heightUnit = isMetric ? 'm' : 'ft';
  const weightUnit = isMetric ? 't' : 'lbs';
  const distanceUnit = isMetric ? 'km' : 'mi';

  return { unitSystem, setUnitSystem, isMetric, formatHeight, formatWeight, formatDistance, heightUnit, weightUnit, distanceUnit };
}
