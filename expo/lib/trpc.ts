import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import * as SecureStore from 'expo-secure-store';

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

export const AUTH_TOKEN_KEY = "auth_session_token";

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    console.warn('[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL is not set — backend calls will fail silently');
  }
  return url ?? '';
};

export function isBackendConfigured(): boolean {
  return !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
}

let cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    SecureStore.setItemAsync(AUTH_TOKEN_KEY, token).catch(() => {});
  } else {
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {});
  }
}

export async function loadAuthToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => {
        if (cachedToken) {
          return { authorization: `Bearer ${cachedToken}` };
        }
        return {};
      },
    }),
  ],
});
