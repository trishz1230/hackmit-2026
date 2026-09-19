import React from 'react';
import { Text } from '../../components/Handwriting';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../lib/theme';

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
        tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
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
      {/* Reached from the Family task / Hangout switcher, not the bottom bar. */}
      <Tabs.Screen name="hangout" options={{ href: null }} />
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
