import { logger } from '@/utils/logger';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_MIN_INTERVAL_MS = 3000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

let currentEndpointIndex = 0;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH = 2;

function getEndpoint(): string {
  return OVERPASS_ENDPOINTS[currentEndpointIndex % OVERPASS_ENDPOINTS.length];
}

function switchEndpoint(): void {
  const prev = currentEndpointIndex;
  currentEndpointIndex = (currentEndpointIndex + 1) % OVERPASS_ENDPOINTS.length;
  logger.log(`[Overpass] Switching endpoint from ${OVERPASS_ENDPOINTS[prev]} to ${OVERPASS_ENDPOINTS[currentEndpointIndex]}`);
}

export function isRateLimited(): boolean {
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH * OVERPASS_ENDPOINTS.length;
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

export function resetOverpassState(): void {
  currentEndpointIndex = 0;
  consecutiveFailures = 0;
  lastOverpassCallTime = 0;
  throttleLock = null;
  controllerRegistry.forEach(c => c.abort());
  controllerRegistry.clear();
  logger.log('[Overpass] State reset');
}

let lastOverpassCallTime = 0;
let throttleLock: Promise<void> | null = null;
const controllerRegistry = new Map<string, AbortController>();

if (__DEV__) {
  const g = globalThis as any;
  if (!g.__OVERPASS_INITIALIZED__) {
    g.__OVERPASS_INITIALIZED__ = true;
  } else {
    console.log('[Overpass] HMR detected — preserving rate-limit state (failures:', consecutiveFailures, ')');
  }
}

export function getAbortSignal(key: string = 'default'): AbortSignal {
  const existing = controllerRegistry.get(key);
  if (existing) {
    existing.abort();
  }
  const controller = new AbortController();
  controllerRegistry.set(key, controller);
  return controller.signal;
}

export async function throttledOverpassFetch(
  query: string,
  label: string = 'Overpass',
  signal?: AbortSignal,
): Promise<Response | null> {
  while (throttleLock) {
    await throttleLock;
  }

  const now = Date.now();
  const elapsed = now - lastOverpassCallTime;
  if (elapsed < OVERPASS_MIN_INTERVAL_MS) {
    const waitMs = OVERPASS_MIN_INTERVAL_MS - elapsed;
    logger.log(`[${label}] Throttling Overpass call, waiting ${waitMs}ms`);
    let resolve: (() => void) | null = null;
    throttleLock = new Promise<void>(r => { resolve = r; });
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
      throttleLock = null;
    }
  }

  if (signal?.aborted) {
    logger.log(`[${label}] Aborted before fetch`);
    return null;
  }

  lastOverpassCallTime = Date.now();
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
    consecutiveFailures++;
    logger.log(`[${label}] Network error (failures: ${consecutiveFailures}):`, fetchError);
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH) {
      switchEndpoint();
    }
    return null;
  }

  if (response.status === 429 || response.status === 504) {
    consecutiveFailures++;
    logger.log(`[${label}] Overpass returned ${response.status} (failures: ${consecutiveFailures}), will retry`);

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES_BEFORE_SWITCH) {
      switchEndpoint();
    }

    lastOverpassCallTime = Date.now() + 10000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) return null;
      const retryEndpoint = getEndpoint();
      logger.log(`[${label}] Retry ${attempt}/${MAX_RETRIES} via ${retryEndpoint} after ${RETRY_DELAY_MS * attempt}ms`);
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      if (signal?.aborted) return null;

      lastOverpassCallTime = Date.now();
      try {
        const retryResp = await fetch(retryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal,
        });
        if (retryResp.ok) {
          consecutiveFailures = 0;
          logger.log(`[${label}] Retry ${attempt} succeeded`);
          return retryResp;
        }
        consecutiveFailures++;
        logger.log(`[${label}] Retry ${attempt} got status ${retryResp.status}`);
      } catch (retryErr) {
        consecutiveFailures++;
        logger.log(`[${label}] Retry ${attempt} failed:`, retryErr);
      }
    }
    return null;
  }

  if (!response.ok) {
    consecutiveFailures++;
    logger.log(`[${label}] Overpass error ${response.status}`);
    return null;
  }

  consecutiveFailures = 0;
  return response;
}
