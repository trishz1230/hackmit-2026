/**
 * The "you can't ignore this" reminder.
 *
 * On Android a scheduled local notification with `sticky: true` cannot be
 * swiped away, and `autoDismiss: false` keeps it up after a tap — no native
 * foreground service required. It re-fires on an interval until the task is
 * done. Local notifications work in Expo Go; they are a no-op on web, where
 * the in-app NagBanner carries the demo.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Cadence } from './types';

/**
 * How often the reminder re-fires. The family picks this so the app nudges
 * without nagging every hour; it never gates when a level can be cleared.
 * Demo-length intervals, not real days.
 */
const REMINDER_INTERVAL_SECONDS: Record<Cadence, number> = {
  daily: 60 * 5,
  every_3_days: 60 * 15,
  weekly: 60 * 30,
};

let scheduledId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function startNagging(prompt: string, cadence: Cadence = 'daily') {
  if (Platform.OS === 'web') return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await stopNagging();
  scheduledId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your family is waiting 👀",
      body: prompt,
      sticky: true,
      autoDismiss: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMINDER_INTERVAL_SECONDS[cadence],
      repeats: true,
    },
  });
}

export async function stopNagging() {
  if (Platform.OS === 'web') return;
  if (scheduledId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledId);
    scheduledId = null;
  }
  await Notifications.dismissAllNotificationsAsync();
}
