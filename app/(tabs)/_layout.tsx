import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // The web phone frame clips its rounded bottom corners, so the bar is
        // taller than default and the label sits clear of the curve.
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 86,
          paddingTop: 6,
          paddingBottom: 22,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>▣</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙</Text>,
        }}
      />
    </Tabs>
  );
}
