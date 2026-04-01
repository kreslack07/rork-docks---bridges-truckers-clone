import { Tabs } from "expo-router";
import { Map, Navigation, AlertTriangle, Truck } from "lucide-react-native";
import React, { useCallback } from "react";
import { Platform } from "react-native";
import * as Haptics from 'expo-haptics';
import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();

  const handleTabPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <Tabs
      screenListeners={{
        tabPress: handleTabPress,
      }}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
            web: { boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          letterSpacing: 0.1,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(map)"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size - 2} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: "Route",
          tabBarIcon: ({ color, size }) => <Navigation color={color} size={size - 2} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="hazards"
        options={{
          title: "Hazards",
          tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size - 2} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Truck",
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size - 2} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
