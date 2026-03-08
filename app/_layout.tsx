import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useOnboarding } from "@/context/OnboardingContext";
import { useTheme } from "@/context/ThemeContext";
import { AppProviders } from "@/context/AppProviders";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastOverlay } from "@/context/ToastContext";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

function StatusBarWrapper() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isComplete, isLoaded } = useOnboarding();
  const { colors } = useTheme();

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isComplete && !inOnboarding && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/onboarding');
    }

    if (isComplete) {
      hasRedirectedRef.current = false;
    }
  }, [isComplete, isLoaded, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="dock-details"
        options={{ presentation: "modal", title: "Dock Details" }}
      />
      <Stack.Screen
        name="hazard-details"
        options={{ presentation: "modal", title: "Hazard Details" }}
      />
      <Stack.Screen
        name="report-hazard"
        options={{ presentation: "modal", title: "Report Hazard" }}
      />
      <Stack.Screen
        name="report-dock"
        options={{ presentation: "modal", title: "Report Dock" }}
      />
      <Stack.Screen
        name="search"
        options={{ presentation: "modal", title: "Search" }}
      />
      <Stack.Screen
        name="auth"
        options={{ presentation: "modal", title: "Account" }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{ title: "Terms of Service" }}
      />
      <Stack.Screen
        name="fleet-manage"
        options={{ presentation: "modal", title: "Fleet Management" }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <ErrorBoundary fallbackMessage="The app encountered an error. Please restart and try again.">
            <AppProviders>
              <StatusBarWrapper />
              <RootLayoutNav />
              <ToastOverlay />
            </AppProviders>
          </ErrorBoundary>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
