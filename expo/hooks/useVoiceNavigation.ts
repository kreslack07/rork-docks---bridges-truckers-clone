import { useRef, useEffect, useCallback } from 'react';
import { TruckProfile, Hazard } from '@/types';
import { useVoice } from '@/context/UserPreferencesContext';
import {
  speakInstruction,
  speakHazardWarning,
  speakNavigationStart,
  speakNavigationEnd,
  speakRerouting,
  stopSpeaking,
  resetVoiceState,
  HazardWarningParams,
} from '@/services/voice-navigation';

interface NavigationProgress {
  currentStepIndex: number;
  currentStep: { instruction: string } | null;
  completionPercent: number;
}

interface LiveRoute {
  blockedHazards: Hazard[];
  tightHazards: Hazard[];
}

interface UseVoiceNavigationParams {
  isNavigating: boolean;
  navProgress: NavigationProgress | null;
  liveRoute: LiveRoute | null;
  isRerouting: boolean;
  profile: TruckProfile;
}

export function useVoiceNavigation({
  isNavigating,
  navProgress,
  liveRoute,
  isRerouting,
  profile,
}: UseVoiceNavigationParams) {
  const { isVoiceEnabled: voiceActive, setVoiceEnabled: setVoiceActive } = useVoice();

  const lastSpokenStepRef = useRef<number>(-1);
  const lastSpokenHazardRef = useRef<Set<string>>(new Set());
  const hasSpokenEndRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isNavigating || !navProgress || !voiceActive) return;

    if (navProgress.currentStepIndex !== lastSpokenStepRef.current && navProgress.currentStep) {
      lastSpokenStepRef.current = navProgress.currentStepIndex;
      speakInstruction(navProgress.currentStep.instruction);
    }

    if (navProgress.completionPercent >= 98 && !hasSpokenEndRef.current) {
      hasSpokenEndRef.current = true;
      speakNavigationEnd();
    }
  }, [isNavigating, navProgress, voiceActive]);

  useEffect(() => {
    if (!isNavigating || !voiceActive || !liveRoute) return;

    for (const hazard of liveRoute.blockedHazards) {
      if (!lastSpokenHazardRef.current.has(hazard.id)) {
        lastSpokenHazardRef.current.add(hazard.id);
        const params: HazardWarningParams = {
          hazardName: hazard.name,
          clearanceHeight: hazard.clearanceHeight,
          truckHeight: profile.height,
          weightLimit: hazard.weightLimit,
          truckWeight: profile.weight,
          widthLimit: hazard.widthLimit,
          truckWidth: profile.width,
          hazardType: hazard.type,
        };
        speakHazardWarning(params);
      }
    }
    for (const hazard of liveRoute.tightHazards) {
      if (!lastSpokenHazardRef.current.has(hazard.id)) {
        lastSpokenHazardRef.current.add(hazard.id);
        const params: HazardWarningParams = {
          hazardName: hazard.name,
          clearanceHeight: hazard.clearanceHeight,
          truckHeight: profile.height,
          weightLimit: hazard.weightLimit,
          truckWeight: profile.weight,
          widthLimit: hazard.widthLimit,
          truckWidth: profile.width,
          hazardType: hazard.type,
        };
        speakHazardWarning(params);
      }
    }
  }, [isNavigating, voiceActive, liveRoute, profile.height, profile.weight, profile.width]);

  useEffect(() => {
    if (isRerouting && voiceActive) {
      speakRerouting();
    }
  }, [isRerouting, voiceActive]);

  const resetVoiceRefs = useCallback(() => {
    lastSpokenStepRef.current = -1;
    lastSpokenHazardRef.current = new Set();
    hasSpokenEndRef.current = false;
    resetVoiceState();
  }, []);

  const handleNavigationStart = useCallback((dest: string) => {
    if (voiceActive) {
      speakNavigationStart(dest);
    }
  }, [voiceActive]);

  const handleToggleVoice = useCallback(() => {
    const next = !voiceActive;
    setVoiceActive(next);
    if (!next) stopSpeaking();
  }, [voiceActive, setVoiceActive]);

  useEffect(() => {
    return () => {
      try {
        stopSpeaking();
        resetVoiceState();
      } catch (error) {
        console.log('[VoiceNav] Cleanup voice error:', error);
      }
    };
  }, []);

  return {
    voiceActive,
    resetVoiceRefs,
    handleNavigationStart,
    handleToggleVoice,
  };
}
