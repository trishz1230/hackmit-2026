import React from 'react';
import { NextGoalPopup } from '../../components/NextGoalPopup';
import { TabBar } from '../../components/TabBar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <>
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="path" options={{ title: 'Path' }} />
      <Tabs.Screen name="plus" options={{ title: 'Post' }} />
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
