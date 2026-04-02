import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

const RATELIMIT_PREFIX = 'ratelimit_';
const RATELIMIT_REGISTRY_KEY = 'ratelimit_registry';
const GC_INTERVAL_MS = 60 * 60 * 1000;
const MAX_KEY_AGE_MS = 24 * 60 * 60 * 1000;

let gcScheduled = false;
let _gcIntervalId: ReturnType<typeof setInterval> | null = null;
let _gcRefCount = 0;

async function runGarbageCollection(): Promise<void> {
  try {
    const registryRaw = await AsyncStorage.getItem(RATELIMIT_REGISTRY_KEY);
    const registry: Record<string, number> = registryRaw ? JSON.parse(registryRaw) : {};
    const now = Date.now();
    const keysToRemove: string[] = [];
    const updatedRegistry: Record<string, number> = {};

    for (const [key, lastUsed] of Object.entries(registry)) {
      if (now - lastUsed > MAX_KEY_AGE_MS) {
        keysToRemove.push(`${RATELIMIT_PREFIX}${key}`);
      } else {
        updatedRegistry[key] = lastUsed;
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      logger.log('[RateLimit] GC removed', keysToRemove.length, 'expired keys');
    }

    await AsyncStorage.setItem(RATELIMIT_REGISTRY_KEY, JSON.stringify(updatedRegistry));
  } catch (e) {
    logger.log('[RateLimit] GC error:', e);
  }
}

function scheduleGC(): void {
  if (gcScheduled) return;
  gcScheduled = true;
  void runGarbageCollection();
  _gcIntervalId = setInterval(() => {
    void runGarbageCollection();
  }, GC_INTERVAL_MS);
}

async function registerKey(key: string): Promise<void> {
  try {
    const registryRaw = await AsyncStorage.getItem(RATELIMIT_REGISTRY_KEY);
    const registry: Record<string, number> = registryRaw ? JSON.parse(registryRaw) : {};
    registry[key] = Date.now();
    await AsyncStorage.setItem(RATELIMIT_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    logger.log('[RateLimit] Registry update error:', e);
  }
}

interface RateLimitConfig {
  key: string;
  maxAttempts: number;
  windowMs: number;
  cooldownMs: number;
}

interface RateLimitState {
  isLimited: boolean;
  remainingAttempts: number;
  cooldownEndsAt: number | null;
  secondsRemaining: number;
}

export function useRateLimit(config: RateLimitConfig) {
  const [state, setState] = useState<RateLimitState>({
    isLimited: false,
    remainingAttempts: config.maxAttempts,
    cooldownEndsAt: null,
    secondsRemaining: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    _gcRefCount++;
    scheduleGC();
    return () => {
      _gcRefCount--;
      if (_gcRefCount <= 0 && _gcIntervalId !== null) {
        clearInterval(_gcIntervalId);
        _gcIntervalId = null;
        gcScheduled = false;
        _gcRefCount = 0;
        logger.log('[RateLimit] GC interval cleared — no active consumers');
      }
    };
  }, []);

  const startCooldownTimer = useCallback((endsAt: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState(prev => ({
          ...prev,
          isLimited: false,
          remainingAttempts: config.maxAttempts,
          cooldownEndsAt: null,
          secondsRemaining: 0,
        }));
        void AsyncStorage.removeItem(`${RATELIMIT_PREFIX}${config.key}`);
      } else {
        setState(prev => ({ ...prev, secondsRemaining: remaining }));
      }
    }, 1000);
  }, [config.key, config.maxAttempts]);

  const checkAndRecord = useCallback(async (): Promise<boolean> => {
    try {
      const storageKey = `${RATELIMIT_PREFIX}${config.key}`;
      const stored = await AsyncStorage.getItem(storageKey);
      const attempts: number[] = stored ? JSON.parse(stored) : [];
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const recentAttempts = attempts.filter(t => t > windowStart);

      if (recentAttempts.length >= config.maxAttempts) {
        const cooldownEnd = now + config.cooldownMs;
        setState({
          isLimited: true,
          remainingAttempts: 0,
          cooldownEndsAt: cooldownEnd,
          secondsRemaining: Math.ceil(config.cooldownMs / 1000),
        });
        startCooldownTimer(cooldownEnd);
        logger.log('[RateLimit] Limited:', config.key);
        return false;
      }

      recentAttempts.push(now);
      await AsyncStorage.setItem(storageKey, JSON.stringify(recentAttempts));
      void registerKey(config.key);

      setState({
        isLimited: false,
        remainingAttempts: config.maxAttempts - recentAttempts.length,
        cooldownEndsAt: null,
        secondsRemaining: 0,
      });
      return true;
    } catch (e) {
      logger.log('[RateLimit] Error:', e);
      return true;
    }
  }, [config, startCooldownTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { ...state, checkAndRecord };
}
