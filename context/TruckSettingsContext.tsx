import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { TruckProfile } from '@/types';
import { usePersistedQuery, usePersistedBoolQuery } from '@/hooks/usePersistedQuery';

const TRUCK_PROFILE_KEY = 'truck_profile';
const VOICE_ENABLED_KEY = 'voice_navigation_enabled';

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
  }), [
    profilePersisted.value,
    updateProfile,
    updateHeight,
    profilePersisted.isLoading,
    voicePersisted.value,
    setVoiceEnabled,
    toggleVoice,
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
