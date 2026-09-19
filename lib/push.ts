import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

/** Expo Go on Android cannot receive remote push (SDK 53+). Local nags still work. */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nags', {
      name: 'Family nags',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch {
    return null;
  }
}

export async function sendExpoPush(
  to: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, title, body, sound: 'default', data }),
    });
  } catch {
    /* The author's phone still nags locally if the app is open. */
  }
}
