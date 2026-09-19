import React from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NotificationController } from '../components/NotificationController';
import { PhoneFrame } from '../components/PhoneFrame';
import { KeyboardDismissLayer } from '../components/KeyboardDismissLayer';
import { AppProvider } from '../lib/store';
import { colors, fonts } from '../lib/theme';

export default function RootLayout() {
  // Not gated on: a font that never resolves would otherwise leave a white
  // screen. Text falls back to the system face until it arrives.
  useFonts({ PatrickHand_400Regular });

  return (
    <SafeAreaProvider>
      <AppProvider>
        <PhoneFrame>
          <StatusBar style="dark" />
          <NotificationController />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.body },
              contentStyle: { backgroundColor: colors.bg },
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="avatar" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="family" options={{ headerShown: false }} />
            <Stack.Screen name="hangout" options={{ title: 'Hangout' }} />
            <Stack.Screen name="settings" options={{ title: 'Family settings' }} />
            <Stack.Screen name="capture" options={{ title: "Today's task", presentation: 'modal' }} />
            <Stack.Screen name="next-goal" options={{ title: 'Next goal' }} />
            <Stack.Screen name="post/[id]" options={{ title: 'Reactions' }} />
            <Stack.Screen name="level/[n]" options={{ title: 'Level' }} />
          </Stack>
          <KeyboardDismissLayer />
        </PhoneFrame>
      </AppProvider>
    </SafeAreaProvider>
  );
}
