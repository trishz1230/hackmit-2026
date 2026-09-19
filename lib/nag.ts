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

const REMINDER_INTERVAL_SECONDS = 60 * 5;

let scheduledId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function startNagging(prompt: string) {
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
      seconds: REMINDER_INTERVAL_SECONDS,
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
