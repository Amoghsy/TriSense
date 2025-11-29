import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0B1220',
          height: 65,
          borderTopWidth: 0,
        },
      }}
    >
      {/* Home Page */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Blind Assistance */}
      <Tabs.Screen
        name="blind"
        options={{
          title: 'Blind',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="eye" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Hearing Assistance */}
      <Tabs.Screen
        name="hearing"
        options={{
          title: 'Hearing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ear" size={size ?? 26} color={color} />
          ),
        }}
      />

      {/* Cognitive Assistance */}
      <Tabs.Screen
        name="cognitive"
        options={{
          title: 'Cognitive',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="brain"
              size={size ?? 26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
