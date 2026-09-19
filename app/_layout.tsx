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
  const [fontsLoaded, fontError] = useFonts({ PatrickHand_400Regular });
  if (!fontsLoaded && !fontError) return null;

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
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="hangout" options={{ title: 'Hangout' }} />
            <Stack.Screen name="settings" options={{ title: 'Family settings' }} />
            <Stack.Screen name="capture" options={{ title: "Today's task", presentation: 'modal' }} />
            <Stack.Screen name="next-goal" options={{ title: 'Next goal' }} />
            <Stack.Screen name="post/[id]" options={{ title: 'Reactions' }} />
          </Stack>
          <KeyboardDismissLayer />
        </PhoneFrame>
      </AppProvider>
    </SafeAreaProvider>
  );
}
