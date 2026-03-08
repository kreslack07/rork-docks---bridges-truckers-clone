import { useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { usePersistedBoolQuery } from '@/hooks/usePersistedQuery';

const ONBOARDING_KEY = 'onboarding_complete';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const persisted = usePersistedBoolQuery({
    key: ONBOARDING_KEY,
    queryKey: ['onboarding'],
    defaultValue: false,
  });

  const { setValue: setPersistedValue, remove: removePersistedValue } = persisted;

  const completeOnboarding = useCallback(() => {
    setPersistedValue(true);
  }, [setPersistedValue]);

  const resetOnboarding = useCallback(() => {
    removePersistedValue();
  }, [removePersistedValue]);

  return {
    isComplete: persisted.value,
    isLoaded: persisted.isLoaded,
    completeOnboarding,
    resetOnboarding,
  };
});
