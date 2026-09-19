import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onNotificationTap, startPostNag, startTaskNag, stopNags } from '../lib/nag';
import { useApp } from '../lib/store';

/** Schedules OS notifications and handles taps. Renders nothing. */
export function NotificationController() {
  const router = useRouter();
  const { group, task, hasPostedThisCycle, unseenPosts, memberById } = useApp();
  const unseen = unseenPosts[0];
  const unseenAuthor = unseen ? memberById(unseen.userId) : undefined;

  useEffect(() => {
    return onNotificationTap((data) => {
      if (data?.type === 'capture') router.push('/capture');
      if (data?.type === 'post' && data.postId) router.push(`/post/${data.postId}`);
    });
  }, [router]);

  useEffect(() => {
    if (!group || group.awaitingNextGoal) {
      void stopNags();
      return;
    }
    if (!hasPostedThisCycle) {
      void startTaskNag(task.prompt);
      return;
    }
    void stopNags();
    if (unseen) {
      void startPostNag(unseenAuthor?.name ?? 'Family', unseen.id);
    }
  }, [group, hasPostedThisCycle, task.prompt, unseen?.id, unseenAuthor?.name]);

  return null;
}
