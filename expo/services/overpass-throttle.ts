import { logger } from '@/utils/logger';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_MIN_INTERVAL_MS = 3000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

const MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH = 2;

interface OverpassState {
  currentEndpointIndex: number;
  consecutiveFailures: number;
  lastOverpassCallTime: number;
  throttleLock: Promise<void> | null;
  controllerRegistry: Map<string, AbortController>;
}

function getOrCreateState(): OverpassState {
  if (__DEV__) {
    const g = globalThis as Record<string, unknown>;
    if (g.__OVERPASS_STATE__) {
      return g.__OVERPASS_STATE__ as OverpassState;
    }
    const state: OverpassState = {
      currentEndpointIndex: 0,
      consecutiveFailures: 0,
      lastOverpassCallTime: 0,
      throttleLock: null,
      controllerRegistry: new Map(),
    };
    g.__OVERPASS_STATE__ = state;
    return state;
  }
  return _state;
}

const _state: OverpassState = {
  currentEndpointIndex: 0,
  consecutiveFailures: 0,
  lastOverpassCallTime: 0,
  throttleLock: null,
  controllerRegistry: new Map(),
};

const state = getOrCreateState();

function getEndpoint(): string {
  return OVERPASS_ENDPOINTS[state.currentEndpointIndex % OVERPASS_ENDPOINTS.length];
}

function switchEndpoint(): void {
  const prev = state.currentEndpointIndex;
  state.currentEndpointIndex = (state.currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
  logger.log(`[Overpass] Switching endpoint from ${OVERPASS_ENDPOINTS[prev]} to ${OVERPASS_ENDPOINTS[state.currentEndpointIndex]}`);
}

export function isRateLimited(): boolean {
  return state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH * OVERPASS_ENDPOINTS.length;
}

export function getConsecutiveFailures(): number {
  return state.consecutiveFailures;
}

export function resetOverpassState(): void {
  state.currentEndpointIndex = 0;
  state.consecutiveFailures = 0;
  state.lastOverpassCallTime = 0;
  state.throttleLock = null;
  state.controllerRegistry.forEach(c => c.abort());
  state.controllerRegistry.clear();
  logger.log('[Overpass] State reset');
}

export function getAbortSignal(key: string = 'default'): AbortSignal {
  const existing = state.controllerRegistry.get(key);
  if (existing) {
    existing.abort();
  }
  const controller = new AbortController();
  state.controllerRegistry.set(key, controller);
  return controller.signal;
}

export async function throttledOverpassFetch(
  query: string,
  label: string = 'Overpass',
  signal?: AbortSignal,
): Promise<Response | null> {
  while (state.throttleLock) {
    await state.throttleLock;
  }

  const now = Date.now();
  const elapsed = now - state.lastOverpassCallTime;
  if (elapsed < OVERPASS_MIN_INTERVAL_MS) {
    const waitMs = OVERPASS_MIN_INTERVAL_MS - elapsed;
    logger.log(`[${label}] Throttling Overpass call, waiting ${waitMs}ms`);
    let resolve: (() => void) | null = null;
    state.throttleLock = new Promise<void>(r => { resolve = r; });
    try {
      await new Promise<void>(r => {
        const timer = setTimeout(r, waitMs);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            r();
          }, { once: true });
        }
      });
    } finally {
      if (resolve) {
        (resolve as () => void)();
      }
      state.throttleLock = null;
    }
  }

  if (signal?.aborted) {
    logger.log(`[${label}] Aborted before fetch`);
    return null;
  }

  state.lastOverpassCallTime = Date.now();
  const endpoint = getEndpoint();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });
  } catch (fetchError) {
    if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
      logger.log(`[${label}] Fetch aborted`);
      return null;
    }
    state.consecutiveFailures++;
    logger.log(`[${label}] Network error (failures: ${state.consecutiveFailures}):`, fetchError);
    if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH) {
      switchEndpoint();
    }
    return null;
  }

  if (response.status === 429 || response.status === 504) {
    state.consecutiveFailures++;
    logger.log(`[${label}] Overpass returned ${response.status} (failures: ${state.consecutiveFailures}), will retry`);

    if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH) {
      switchEndpoint();
    }

    state.lastOverpassCallTime = Date.now() + 10000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) return null;
      const retryEndpoint = getEndpoint();
      logger.log(`[${label}] Retry ${attempt}/${MAX_RETRIES} via ${retryEndpoint} after ${RETRY_DELAY_MS * attempt}ms`);
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      if (signal?.aborted) return null;

      state.lastOverpassCallTime = Date.now();
      try {
        const retryResp = await fetch(retryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal,
        });
        if (retryResp.ok) {
          state.consecutiveFailures = 0;
          logger.log(`[${label}] Retry ${attempt} succeeded`);
          return retryResp;
        }
        state.consecutiveFailures++;
        logger.log(`[${label}] Retry ${attempt} got status ${retryResp.status}`);
      } catch (retryErr) {
        state.consecutiveFailures++;
        logger.log(`[${label}] Retry ${attempt} failed:`, retryErr);
      }
    }
    return null;
  }

  if (!response.ok) {
    state.consecutiveFailures++;
    logger.log(`[${label}] Overpass error ${response.status}`);
    return null;
  }

  state.consecutiveFailures = 0;
  return response;
}
