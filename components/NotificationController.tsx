import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onNotificationTap, startPostNag, startReactionNag, startTaskNag, stopNags } from '../lib/nag';
import { useApp } from '../lib/store';

/** Schedules OS notifications and handles taps. Renders nothing. */
export function NotificationController() {
  const router = useRouter();
  const { group, task, hasPostedThisCycle, taskLocked, unseenPosts, unseenReactions, memberById } =
    useApp();
  const unseen = unseenPosts[0];
  const unseenAuthor = unseen ? memberById(unseen.userId) : undefined;
  const reactionNag = unseenReactions[0];

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
    if (reactionNag) {
      void startReactionNag(reactionNag, group.cadence);
      return;
    }
    if (!hasPostedThisCycle && !taskLocked) {
      void startTaskNag(task.prompt);
      return;
    }
    void stopNags();
    if (unseen) {
      void startPostNag(unseenAuthor?.name ?? 'Family', unseen.id, group.cadence);
    }
  }, [
    group,
    hasPostedThisCycle,
    taskLocked,
    task.prompt,
    reactionNag?.id,
    unseen?.id,
    unseenAuthor?.name,
  ]);

  return null;
}
