import React from 'react';
import { Text } from '../../components/Handwriting';
import { Tabs, useRouter } from 'expo-router';
import { useApp } from '../../lib/store';
import { colors, fonts } from '../../lib/theme';

export default function TabLayout() {
  const router = useRouter();
  const { group } = useApp();
  const currentLevel = group ? Math.min(group.level, group.goal) : 1;

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
        name="path"
        options={{
          title: 'Path',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◈</Text>,
        }}
      />
      {/* Not a screen of its own — it drops you on the level you're posting to. */}
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>＋</Text>,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push(`/level/${currentLevel}`);
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙</Text>,
        }}
      />
      {/* Reached from the Family task / Hangout switcher, not the bottom bar. */}
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="hangout" options={{ href: null }} />
    </Tabs>
  );
}
