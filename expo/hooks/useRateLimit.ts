import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        AsyncStorage.removeItem(`ratelimit_${config.key}`);
      } else {
        setState(prev => ({ ...prev, secondsRemaining: remaining }));
      }
    }, 1000);
  }, [config.key, config.maxAttempts]);

  const checkAndRecord = useCallback(async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(`ratelimit_${config.key}`);
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
        console.log('[RateLimit] Limited:', config.key);
        return false;
      }

      recentAttempts.push(now);
      await AsyncStorage.setItem(`ratelimit_${config.key}`, JSON.stringify(recentAttempts));

      setState({
        isLimited: false,
        remainingAttempts: config.maxAttempts - recentAttempts.length,
        cooldownEndsAt: null,
        secondsRemaining: 0,
      });
      return true;
    } catch (e) {
      console.log('[RateLimit] Error:', e);
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
