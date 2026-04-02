import { Platform } from 'react-native';

import { logger } from '@/utils/logger';
import { getCountryByCode, DEFAULT_COUNTRY_CODE } from '@/constants/countries';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

let Speech: typeof import('expo-speech') | null = null;
if (!isWeb) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech');
}

const SPEAKING_SAFETY_TIMEOUT_MS = 30000;
const COUNTRY_CODE_KEY = 'selected_country_code';

let _cachedVoiceLang: string = getCountryByCode(DEFAULT_COUNTRY_CODE).voiceLanguage;

void AsyncStorage.getItem(COUNTRY_CODE_KEY).then(code => {
  if (code) {
    _cachedVoiceLang = getCountryByCode(code).voiceLanguage;
    logger.log('[Voice] Language set from stored country:', _cachedVoiceLang);
  }
}).catch(() => {});

export function setVoiceLanguage(lang: string): void {
  _cachedVoiceLang = lang;
  logger.log('[Voice] Language updated:', lang);
}

function getVoiceLang(): string {
  return _cachedVoiceLang;
}

const g = globalThis as Record<string, any>;
if (g.__VOICE_NAV_STATE__ === undefined) {
  g.__VOICE_NAV_STATE__ = {
    lastSpokenInstruction: '',
    speechQueue: [] as string[],
    isSpeaking: false,
    speakingTimeout: null as ReturnType<typeof setTimeout> | null,
  };
}

function getState() {
  return g.__VOICE_NAV_STATE__ as {
    lastSpokenInstruction: string;
    speechQueue: string[];
    isSpeaking: boolean;
    speakingTimeout: ReturnType<typeof setTimeout> | null;
  };
}

async function processQueue(): Promise<void> {
  const state = getState();
  if (state.isSpeaking || state.speechQueue.length === 0) return;

  state.isSpeaking = true;
  const text = state.speechQueue.shift();
  if (!text) {
    state.isSpeaking = false;
    return;
  }

  if (state.speakingTimeout) clearTimeout(state.speakingTimeout);
  state.speakingTimeout = setTimeout(() => {
    logger.log('[Voice] Safety timeout — resetting isSpeaking');
    state.isSpeaking = false;
    state.speakingTimeout = null;
    void processQueue();
  }, SPEAKING_SAFETY_TIMEOUT_MS);

  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getVoiceLang();
        utterance.rate = 0.9;
        utterance.onend = () => {
          state.isSpeaking = false;
          if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
          void processQueue();
        };
        utterance.onerror = () => {
          state.isSpeaking = false;
          if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
          logger.log('[Voice] Web speech error');
          void processQueue();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        state.isSpeaking = false;
        void processQueue();
      }
    } catch (e) {
      state.isSpeaking = false;
      logger.log('[Voice] Web speech error:', e);
      void processQueue();
    }
    return;
  }

  try {
    Speech?.speak(text, {
      language: getVoiceLang(),
      rate: Platform.OS === 'ios' ? 0.52 : 0.9,
      pitch: 1.0,
      onDone: () => {
        state.isSpeaking = false;
        if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
        void processQueue();
      },
      onError: () => {
        state.isSpeaking = false;
        if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
        logger.log('[Voice] Speech error');
        void processQueue();
      },
    });
  } catch (e) {
    state.isSpeaking = false;
    if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
    logger.log('[Voice] Speech error:', e);
    void processQueue();
  }
}

export function speakInstruction(instruction: string): void {
  const state = getState();
  if (instruction === state.lastSpokenInstruction) return;

  state.lastSpokenInstruction = instruction;

  const cleaned = instruction
    .replace(/\b(\d+(\.\d+)?)\s*m\b/g, '$1 metres')
    .replace(/\b(\d+(\.\d+)?)\s*km\b/g, '$1 kilometres');

  state.speechQueue.push(cleaned);
  void processQueue();
  logger.log('[Voice] Speaking:', cleaned);
}

export interface HazardWarningParams {
  hazardName: string;
  clearanceHeight: number;
  truckHeight: number;
  weightLimit?: number;
  truckWeight?: number;
  widthLimit?: number;
  truckWidth?: number;
  hazardType?: string;
}

export function speakHazardWarning(
  hazardNameOrParams: string | HazardWarningParams,
  clearanceHeight?: number,
  truckHeight?: number,
): void {
  let params: HazardWarningParams;

  if (typeof hazardNameOrParams === 'string') {
    params = {
      hazardName: hazardNameOrParams,
      clearanceHeight: clearanceHeight ?? 0,
      truckHeight: truckHeight ?? 0,
    };
  } else {
    params = hazardNameOrParams;
  }

  const reasons: string[] = [];

  const heightDiff = params.clearanceHeight - params.truckHeight;
  const heightBlocked = heightDiff < 0;
  const heightTight = heightDiff >= 0 && heightDiff < 0.3;
  const weightBlocked = params.truckWeight && params.weightLimit ? params.truckWeight > params.weightLimit : false;
  const widthBlocked = params.truckWidth && params.widthLimit ? params.truckWidth > params.widthLimit : false;

  if (heightBlocked) reasons.push(`Clearance is ${params.clearanceHeight.toFixed(1)} metres, your truck is ${params.truckHeight.toFixed(1)} metres tall`);
  if (weightBlocked) reasons.push(`Weight limit is ${params.weightLimit} tonnes, your truck weighs ${params.truckWeight} tonnes`);
  if (widthBlocked) reasons.push(`Width limit is ${params.widthLimit} metres, your truck is ${params.truckWidth} metres wide`);

  let message: string;

  if (reasons.length > 0) {
    message = `Warning! ${params.hazardName} ahead. ${reasons.join('. ')}. Find an alternative route.`;
  } else if (heightTight) {
    message = `Caution. ${params.hazardName} ahead. Tight clearance of ${params.clearanceHeight.toFixed(1)} metres. Proceed carefully.`;
  } else {
    message = `${params.hazardName} ahead. Clearance ${params.clearanceHeight.toFixed(1)} metres. Safe to pass.`;
  }

  getState().speechQueue.unshift(message);
  void processQueue();
  logger.log('[Voice] Hazard warning:', message);
}

export function speakNavigationStart(destination: string): void {
  const message = `Navigation started. Heading to ${destination}.`;
  getState().speechQueue.push(message);
  void processQueue();
}

export function speakNavigationEnd(): void {
  getState().speechQueue = ['You have arrived at your destination.'];
  void processQueue();
}

export function speakRerouting(): void {
  getState().speechQueue = ['Recalculating route.'];
  void processQueue();
}

export function speakDistanceUpdate(distanceMeters: number): void {
  let message: string;
  if (distanceMeters >= 1000) {
    const km = (distanceMeters / 1000).toFixed(1);
    message = `${km} kilometres remaining.`;
  } else {
    message = `${Math.round(distanceMeters)} metres remaining.`;
  }

  getState().speechQueue.push(message);
  void processQueue();
}

export function stopSpeaking(): void {
  const state = getState();
  state.speechQueue = [];
  state.lastSpokenInstruction = '';
  state.isSpeaking = false;
  if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      void Speech?.stop();
    }
  } catch (e) {
    logger.log('[Voice] Stop error:', e);
  }
}

export function resetVoiceState(): void {
  const state = getState();
  state.lastSpokenInstruction = '';
  state.speechQueue = [];
  state.isSpeaking = false;
  if (state.speakingTimeout) { clearTimeout(state.speakingTimeout); state.speakingTimeout = null; }
}
