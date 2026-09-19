import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PhoneFrame } from '../components/PhoneFrame';
import { AppProvider } from '../lib/store';
import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <PhoneFrame>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'FamStreak' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="hangout" options={{ title: 'Hangout' }} />
            <Stack.Screen name="settings" options={{ title: 'Family settings' }} />
            <Stack.Screen name="levels" options={{ title: 'Level map' }} />
            <Stack.Screen name="capture" options={{ title: 'New post', presentation: 'modal' }} />
            <Stack.Screen name="post/[id]" options={{ title: 'Reactions' }} />
          </Stack>
        </PhoneFrame>
      </AppProvider>
    </SafeAreaProvider>
  );
}
