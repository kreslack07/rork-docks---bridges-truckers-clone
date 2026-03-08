import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { trpcClient, setAuthToken, loadAuthToken, isBackendConfigured } from '@/lib/trpc';

const AUTH_USER_KEY = 'auth_user_cache';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const validateSessionMutation = useMutation({
    mutationFn: async () => {
      if (!isBackendConfigured()) {
        console.log('[Auth] Backend not configured — skipping session validation');
        return null;
      }
      return await trpcClient.auth.getMe.query();
    },
    onSuccess: async (freshUser) => {
      if (freshUser) {
        setUser(freshUser);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
        console.log('[Auth] Validated session with backend:', freshUser.email);
      }
    },
    onError: async () => {
      console.log('[Auth] Session expired or invalid, clearing');
      setAuthToken(null);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    },
    onSettled: () => {
      setIsValidating(false);
    },
  });

  const validateRef = useRef(validateSessionMutation);
  validateRef.current = validateSessionMutation;

  useEffect(() => {
    (async () => {
      try {
        const token = await loadAuthToken();
        if (token) {
          const cachedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
          if (cachedUser) {
            const parsed = JSON.parse(cachedUser) as AuthUser;
            setUser(parsed);
            console.log('[Auth] Restored cached user:', parsed.email);
          }

          setIsValidating(true);
          validateRef.current.mutate();
        } else {
          console.log('[Auth] No stored token found');
        }
      } catch (err) {
        console.log('[Auth] Error loading auth state:', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      if (!isBackendConfigured()) {
        throw new Error('Backend is not configured. Please set EXPO_PUBLIC_RORK_API_BASE_URL.');
      }
      const result = await trpcClient.auth.signUp.mutate({ email, password, displayName });
      setAuthToken(result.token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      console.log('[Auth] Signed up via backend:', result.user.email);
      return result.user;
    },
    onSuccess: (data) => setUser(data),
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      if (!isBackendConfigured()) {
        throw new Error('Backend is not configured. Please set EXPO_PUBLIC_RORK_API_BASE_URL.');
      }
      const result = await trpcClient.auth.signIn.mutate({ email, password });
      setAuthToken(result.token);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
      console.log('[Auth] Signed in via backend:', result.user.email);
      return result.user;
    },
    onSuccess: (data) => setUser(data),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      if (isBackendConfigured()) {
        try {
          await trpcClient.auth.signOut.mutate();
        } catch {
          console.log('[Auth] Backend signout failed, clearing locally');
        }
      }
      setAuthToken(null);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      console.log('[Auth] Signed out');
    },
    onSuccess: () => setUser(null),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!isBackendConfigured()) {
        throw new Error('Backend is not configured. Please set EXPO_PUBLIC_RORK_API_BASE_URL.');
      }
      await trpcClient.auth.deleteAccount.mutate();
      setAuthToken(null);
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      console.log('[Auth] Account deleted');
    },
    onSuccess: () => setUser(null),
  });

  return {
    user,
    isLoaded,
    isAuthenticated: !!user,
    isValidating,
    signUp: signUpMutation.mutateAsync,
    signIn: signInMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeletingAccount: deleteAccountMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    authError: signUpMutation.error?.message ?? signInMutation.error?.message ?? null,
  };
});
