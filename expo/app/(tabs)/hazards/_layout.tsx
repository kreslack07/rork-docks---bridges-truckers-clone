import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import ScreenErrorBoundary from "@/components/ScreenErrorBoundary";

export default function HazardsLayout() {
  const { colors } = useTheme();
  return (
    <ScreenErrorBoundary screenName="Hazards" colors={colors}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Hazard Directory" }}
        />
      </Stack>
    </ScreenErrorBoundary>
  );
}
