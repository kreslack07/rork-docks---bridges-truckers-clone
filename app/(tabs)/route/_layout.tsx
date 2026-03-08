import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import ScreenErrorBoundary from "@/components/ScreenErrorBoundary";

export default function RouteLayout() {
  const { colors } = useTheme();
  return (
    <ScreenErrorBoundary screenName="Route" colors={colors}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Route Planner" }}
        />
      </Stack>
    </ScreenErrorBoundary>
  );
}
