/**
 * OS local notifications only — no in-app banner.
 * iOS can still swipe alerts away; Android sticky helps. Tap opens Capture or the post.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REPEAT_SECONDS = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermission() {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nags', {
      name: 'Family nags',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  return status === 'granted';
}

async function fire(content: Notifications.NotificationContentInput) {
  if (!(await ensurePermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();

  const payload = {
    ...content,
    sticky: true,
    autoDismiss: false,
    sound: true,
  };

  await Notifications.scheduleNotificationAsync({
    content: payload,
    trigger: null,
  });

  await Notifications.scheduleNotificationAsync({
    content: payload,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REPEAT_SECONDS,
      repeats: true,
      ...(Platform.OS === 'android' ? { channelId: 'nags' } : {}),
    },
  });
}

export async function startTaskNag(prompt: string) {
  await fire({
    title: 'Your family is waiting 👀',
    body: prompt,
    data: { type: 'capture' },
  });
}

export async function startPostNag(authorName: string, postId: string) {
  await fire({
    title: `${authorName} posted`,
    body: 'Open to react — like, comment, call, or send an emoji.',
    data: { type: 'post', postId },
  });
}

export async function stopNags() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}

export function onNotificationTap(
  handler: (data: { type?: string; postId?: string }) => void
) {
  if (Platform.OS === 'web') return () => undefined;

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      type?: string;
      postId?: string;
    };
    handler(data);
  });

  return () => sub.remove();
}
