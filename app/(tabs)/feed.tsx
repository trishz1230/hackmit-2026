import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarButton } from '../../components/AvatarButton';
import { CompletedAnnouncement } from '../../components/CompletedAnnouncement';
import { PostCard } from '../../components/PostCard';
import { Tabs } from '../../components/Tabs';
import { answeredLevel, feedLevel, isExtraPost, withinLevel } from '../../lib/posts';
import { useApp } from '../../lib/store';
import { paper, radius, spacing } from '../../lib/theme';

export default function Feed() {
  const router = useRouter();
  const {
    group,
    posts,
    tasks,
    task,
    me,
    pending,
    remindToPost,
    taskLocked,
    taskForLevel,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    promptFor,
    loading,
  } = useApp();
  const insets = useSafeAreaInsets();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  // Only answers to a task belong here; extra shares live in hangout. The feed
  // follows the level being played, and holds on the last answered one until
  // somebody starts the new level.
  const current = Math.min(group.level, group.goal);
  // A locked level keeps its prompt hidden, so the feed stays on the level
  // before it rather than showing a card nobody can answer.
  const level = taskLocked
    ? Math.max(1, Math.min(feedLevel(tasks, posts, current), task.level - 1))
    : feedLevel(tasks, posts, current);
  const answers = withinLevel(posts, tasks, level).filter((p) => !isExtraPost(p, posts));
  // The card is the task to answer, so while the next level is open it runs
  // ahead of the posts below it, which stay on the level the family answered.
  const shown = (taskLocked ? taskForLevel(level) : task) ?? task;
  // Read against the level on the card: the family's current task can be a
  // different row by the time an answer lands, which left the button up.
  const mine = answeredLevel(tasks, posts, shown.level, me.id);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <FlatList
        data={answers}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.push('/(tabs)/path')} hitSlop={8}>
                <Text style={styles.back}>← the map</Text>
              </Pressable>
              <AvatarButton />
            </View>
            <Tabs active="family" />
            <View style={styles.header}>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.sub}>Invite code: {group.joinCode}</Text>
            </View>
            <View style={styles.task}>
              <Text style={styles.taskLabel}>Level {shown.level} task</Text>
              {taskLocked ? (
                <>
                  <Text style={styles.taskPrompt}>{shown.prompt}</Text>
                  <Text style={styles.locked}>
                    🔒 The next level is locked — wait till the next notification for a new
                    conversation :)
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.taskPrompt}>{shown.prompt}</Text>
                  {mine ? (
                    <CompletedAnnouncement pending={pending} onRemind={remindToPost} />
                  ) : (
                    <Pressable
                      style={styles.cta}
                      onPress={() => router.push(`/capture?level=${shown.level}`)}
                    >
                      <Text style={styles.ctaText}>Complete task</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No posts yet. Complete a level to share with family.</Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            prompt={promptFor(item.taskId)}
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => toggleLike(item.id)}
            liked={likedByMe(item.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: paper.page },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  back: { fontSize: 17, color: paper.muted },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 26, color: paper.ink },
  sub: { marginTop: 2, fontSize: 15, color: paper.muted },
  task: {
    margin: spacing.md,
    marginTop: 0,
    marginBottom: 0,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: paper.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: paper.line,
  },
  taskLabel: {
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    color: paper.muted,
  },
  taskPrompt: { fontSize: 18, color: paper.ink, lineHeight: 24 },
  locked: { fontSize: 16, color: paper.muted, lineHeight: 22 },
  cta: {
    marginTop: spacing.xs,
    backgroundColor: paper.button,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: paper.ink, fontSize: 18 },
  empty: { margin: spacing.lg, color: paper.muted, textAlign: 'center' },
});
