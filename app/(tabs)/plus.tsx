import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { AvatarButton } from '../../components/AvatarButton';
import { Tabs } from '../../components/Tabs';
import { EXTRA_PROMPT, hangoutLocked, isExtraPost, shownLevel, withinLevel } from '../../lib/posts';
import { useApp } from '../../lib/store';
import { paper, radius, spacing } from '../../lib/theme';

/** The ＋ tab: post anything to the family, counting toward no level. */
export default function Plus() {
  const router = useRouter();
  const {
    group,
    posts,
    tasks,
    task,
    taskLocked,
    hangoutPosts,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    me,
    loading,
  } = useApp();
  const insets = useSafeAreaInsets();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  // Extra shares made against a task belong here too, not in the family feed,
  // and hangout follows the same level as the family feed.
  const level = shownLevel(
    tasks,
    posts,
    Math.min(group.level, group.goal),
    task.level,
    taskLocked
  );
  const shares = withinLevel(
    [...hangoutPosts, ...posts.filter((p) => isExtraPost(p, posts, tasks))],
    tasks,
    level,
    posts
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Answer the family first: hangout opens once your answer to the level being
  // shown is in.
  const locked = hangoutLocked(tasks, posts, level, me.id);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <FlatList
        data={locked ? [] : shares}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.push('/(tabs)/path')} hitSlop={8}>
                <Text style={styles.back}>← the map</Text>
              </Pressable>
              <AvatarButton />
            </View>
            <Tabs active="hangout" />
            <View style={styles.header}>
              <Text style={styles.title}>hangout</Text>
              <Text style={styles.body}>
                {locked
                  ? '🔒 Locked! Answer the family task first, then hangout is all yours.'
                  : `Share whatever you want with ${group.name} — nothing here counts toward the level.`}
              </Text>
              {locked ? null : (
                <Pressable
                  style={styles.cta}
                  onPress={() => router.push('/capture?channel=hangout')}
                >
                  <Text style={styles.ctaText}>Share something</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          locked ? null : <Text style={styles.empty}>Nothing yet — be the first.</Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            prompt={EXTRA_PROMPT}
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
    margin: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 0,
    padding: spacing.md,
    backgroundColor: paper.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: paper.line,
  },
  title: { fontSize: 26, color: paper.ink },
  body: { marginTop: spacing.xs, fontSize: 16, color: paper.muted, lineHeight: 22 },
  cta: {
    marginTop: spacing.md,
    backgroundColor: paper.button,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: paper.ink, fontSize: 18 },
  empty: { textAlign: 'center', color: paper.muted, marginTop: spacing.lg },
});
