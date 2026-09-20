/**
 * OS local notifications only — no in-app banner.
 * iOS can still swipe alerts away; Android sticky helps. Tap opens Capture or the post.
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

/** Waking hours the task reminder is allowed to land in, on the member's own clock. */
const NAG_WINDOW = { startHour: 9, endHour: 21 };

/**
 * Seconds until a random moment inside today's waking window, or tomorrow's if
 * the window has already closed. Each member's device rolls its own time, so a
 * family isn't pinged in unison every day at the same hour.
 */
export function secondsUntilRandomNag(now = new Date()): number {
  const at = (hour: number, day = now) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
  let from = Math.max(now.getTime() + 60_000, at(NAG_WINDOW.startHour));
  let until = at(NAG_WINDOW.endHour);
  if (from >= until) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    from = at(NAG_WINDOW.startHour, tomorrow);
    until = at(NAG_WINDOW.endHour, tomorrow);
  }
  return Math.round((from + Math.random() * (until - from) - now.getTime()) / 1000);
}

async function fire(content: Notifications.NotificationContentInput, cadence: Cadence = 'daily') {
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
      seconds: REMINDER_INTERVAL_SECONDS[cadence],
      repeats: true,
      ...(Platform.OS === 'android' ? { channelId: 'nags' } : {}),
    },
  });
}

/**
 * The task reminder first lands at an unpredictable moment (capped at one
 * reminder interval so a demo still shows it), then keeps coming back every
 * interval until the member posts — posting flips hasPostedThisCycle, which
 * makes the controller call stopNags.
 */
export async function startTaskNag(prompt: string, cadence: Cadence = 'daily') {
  if (!(await ensurePermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const content: Notifications.NotificationContentInput = {
    title: 'Your family is waiting 👀',
    body: prompt,
    data: { type: 'capture' },
    sound: true,
    sticky: true,
    autoDismiss: false,
  };
  const trigger = (seconds: number, repeats: boolean): Notifications.TimeIntervalTriggerInput => ({
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats,
    ...(Platform.OS === 'android' ? { channelId: 'nags' } : {}),
  });

  const firstIn = Math.min(secondsUntilRandomNag(), REMINDER_INTERVAL_SECONDS[cadence]);
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: trigger(firstIn, false),
  });
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: trigger(REMINDER_INTERVAL_SECONDS[cadence], true),
  });
}

export async function startPostNag(authorName: string, postId: string, cadence: Cadence = 'daily') {
  await fire(
    {
      title: `${authorName} posted`,
      body: 'Open to react — like, comment, call, or send an emoji.',
      data: { type: 'post', postId },
    },
    cadence
  );
}

export async function startReactionNag(
  nag: {
    actorName: string;
    authorName: string;
    kind: 'like' | 'emoji' | 'comment';
    value: string;
    postId: string;
    forMe: boolean;
  },
  cadence: Cadence = 'daily'
) {
  const action =
    nag.kind === 'like'
      ? 'liked'
      : nag.kind === 'comment'
        ? 'commented on'
        : `reacted ${nag.value} to`;
  const title = nag.forMe
    ? nag.kind === 'comment'
      ? `${nag.actorName} commented`
      : nag.kind === 'like'
        ? `${nag.actorName} liked your post`
        : `${nag.actorName} reacted ${nag.value}`
    : `${nag.authorName}: ${nag.actorName} ${action} your post`;
  const body =
    nag.kind === 'comment' && nag.value
      ? nag.value
      : nag.forMe
        ? 'Open to see their reaction.'
        : 'They got a ping — open the post.';
  await fire(
    {
      title,
      body,
      data: { type: 'post', postId: nag.postId },
    },
    cadence
  );
}

export async function fireOnce(
  title: string,
  body: string,
  data: Record<string, string> = { type: 'capture' }
) {
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'nags' } : {}),
    },
    trigger: null,
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
