import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import ScreenErrorBoundary from "@/components/ScreenErrorBoundary";

export default function ProfileLayout() {
  const { colors } = useTheme();
  return (
    <ScreenErrorBoundary screenName="Profile" colors={colors}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "My Truck" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: "Settings" }}
        />
      </Stack>
    </ScreenErrorBoundary>
  );
}
