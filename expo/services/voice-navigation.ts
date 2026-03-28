import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

const isWeb = Platform.OS === 'web';

let Speech: typeof import('expo-speech') | null = null;
if (!isWeb) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Speech = require('expo-speech');
}

let lastSpokenInstruction = '';
let speechQueue: string[] = [];
let isSpeaking = false;
let speakingTimeout: ReturnType<typeof setTimeout> | null = null;

const SPEAKING_SAFETY_TIMEOUT_MS = 30000;

if (__DEV__) {
  const g = globalThis as any;
  if (g.__VOICE_NAV_HOT_RESET__) {
    resetVoiceState();
  }
  g.__VOICE_NAV_HOT_RESET__ = true;
}

async function processQueue(): Promise<void> {
  if (isSpeaking || speechQueue.length === 0) return;

  isSpeaking = true;
  const text = speechQueue.shift();
  if (!text) {
    isSpeaking = false;
    return;
  }

  if (speakingTimeout) clearTimeout(speakingTimeout);
  speakingTimeout = setTimeout(() => {
    logger.log('[Voice] Safety timeout — resetting isSpeaking');
    isSpeaking = false;
    speakingTimeout = null;
    void processQueue();
  }, SPEAKING_SAFETY_TIMEOUT_MS);

  if (isWeb) {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-AU';
        utterance.rate = 0.9;
        utterance.onend = () => {
          isSpeaking = false;
          if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
          void processQueue();
        };
        utterance.onerror = () => {
          isSpeaking = false;
          if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
          logger.log('[Voice] Web speech error');
          void processQueue();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        isSpeaking = false;
        void processQueue();
      }
    } catch (e) {
      isSpeaking = false;
      logger.log('[Voice] Web speech error:', e);
      void processQueue();
    }
    return;
  }

  try {
    Speech?.speak(text, {
      language: 'en-AU',
      rate: Platform.OS === 'ios' ? 0.52 : 0.9,
      pitch: 1.0,
      onDone: () => {
        isSpeaking = false;
        if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
        void processQueue();
      },
      onError: () => {
        isSpeaking = false;
        if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
        logger.log('[Voice] Speech error');
        void processQueue();
      },
    });
  } catch (e) {
    isSpeaking = false;
    if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
    logger.log('[Voice] Speech error:', e);
    void processQueue();
  }
}

export function speakInstruction(instruction: string): void {
  if (instruction === lastSpokenInstruction) return;

  lastSpokenInstruction = instruction;

  const cleaned = instruction
    .replace(/\b(\d+(\.\d+)?)\s*m\b/g, '$1 metres')
    .replace(/\b(\d+(\.\d+)?)\s*km\b/g, '$1 kilometres');

  speechQueue.push(cleaned);
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

  speechQueue.unshift(message);
  void processQueue();
  logger.log('[Voice] Hazard warning:', message);
}

export function speakNavigationStart(destination: string): void {
  const message = `Navigation started. Heading to ${destination}.`;
  speechQueue.push(message);
  void processQueue();
}

export function speakNavigationEnd(): void {
  speechQueue = ['You have arrived at your destination.'];
  void processQueue();
}

export function speakRerouting(): void {
  speechQueue = ['Recalculating route.'];
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

  speechQueue.push(message);
  void processQueue();
}

export function stopSpeaking(): void {
  speechQueue = [];
  lastSpokenInstruction = '';
  isSpeaking = false;
  if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
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
  lastSpokenInstruction = '';
  speechQueue = [];
  isSpeaking = false;
  if (speakingTimeout) { clearTimeout(speakingTimeout); speakingTimeout = null; }
}
