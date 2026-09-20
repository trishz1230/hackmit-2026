import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarButton } from '../../components/AvatarButton';
import { CompletedAnnouncement } from '../../components/CompletedAnnouncement';
import { PostCard } from '../../components/PostCard';
import { Tabs } from '../../components/Tabs';
import { EXTRA_PROMPT, isExtraPost } from '../../lib/posts';
import { useApp } from '../../lib/store';
import { paper, radius, spacing } from '../../lib/theme';

export default function Feed() {
  const router = useRouter();
  const {
    group,
    posts,
    task,
    hasPostedThisCycle,
    pending,
    remindToPost,
    taskLocked,
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

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <AvatarButton />
      </View>
      <Tabs active="family" />
      <View style={styles.header}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.sub}>Invite code: {group.joinCode}</Text>
      </View>
      <View style={styles.task}>
        <Text style={styles.taskLabel}>Level {Math.min(group.level, group.goal)} task</Text>
        {taskLocked ? (
          <Text style={styles.taskPrompt}>
            🔒 Locked! Wait till the next notification for a new conversation :)
          </Text>
        ) : (
          <>
            <Text style={styles.taskPrompt}>{task.prompt}</Text>
            {hasPostedThisCycle ? (
              <CompletedAnnouncement pending={pending} onRemind={remindToPost} />
            ) : (
              <Pressable style={styles.cta} onPress={() => router.push('/capture')}>
                <Text style={styles.ctaText}>Complete task</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No posts yet. Complete a level to share with family.</Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            prompt={isExtraPost(item, posts) ? EXTRA_PROMPT : promptFor(item.taskId)}
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
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.md },
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
