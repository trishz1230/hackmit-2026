import React from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { NextGoalPopup } from '../../components/NextGoalPopup';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../lib/theme';

export default function TabLayout() {
  return (
    <>
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
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Post',
          // Drawn as two bars: the handwriting font has no plus glyph.
          tabBarIcon: ({ color }) => (
            <View style={{ width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ position: 'absolute', width: 16, height: 2, backgroundColor: color }} />
              <View style={{ position: 'absolute', width: 2, height: 16, backgroundColor: color }} />
            </View>
          ),
        }}
      />
      {/* Reached by tapping your avatar, not the bottom bar. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      {/* Reached from the Family task / Hangout switcher, not the bottom bar. */}
      <Tabs.Screen name="feed" options={{ href: null }} />
      {/* In the tab group only so a level keeps the bottom bar. */}
      <Tabs.Screen name="level/[n]" options={{ href: null }} />
      <Tabs.Screen name="hangout" options={{ href: null }} />
    </Tabs>
    <NextGoalPopup />
    </>
  );
}
