import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import ScreenErrorBoundary from "@/components/ScreenErrorBoundary";

export default function MapLayout() {
  const { colors } = useTheme();
  return (
    <ScreenErrorBoundary screenName="Map" colors={colors}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />
      </Stack>
    </ScreenErrorBoundary>
  );
}
