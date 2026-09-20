import React from 'react';
import { Tabs } from 'expo-router';
import { NextGoalPopup } from '../../components/NextGoalPopup';
import { NavBar } from '../../components/NavBar';

export default function TabLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <NavBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="path" />
        {/* ＋ never renders — the bar's round button pushes the level page. */}
        <Tabs.Screen name="plus" options={{ href: null }} />
        {/* Reached by tapping your avatar, not the bottom bar. */}
        <Tabs.Screen name="settings" options={{ href: null }} />
        {/* Reached from the Family task / Hangout switcher, not the bar. */}
        <Tabs.Screen name="feed" options={{ href: null }} />
        {/* In the tab group only so a level keeps the bottom bar. */}
        <Tabs.Screen name="level/[n]" options={{ href: null }} />
        <Tabs.Screen name="hangout" options={{ href: null }} />
      </Tabs>
      <NextGoalPopup />
    </>
  );
}
