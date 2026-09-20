import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../components/Handwriting';
import { CompletedAnnouncement } from '../../../components/CompletedAnnouncement';
import { PostCard } from '../../../components/PostCard';
import { Tabs } from '../../../components/Tabs';
import { levelSymbol } from '../../../components/LevelMap';
import { AvatarButton } from '../../../components/AvatarButton';
import { EXTRA_PROMPT, isExtraPost, withinLevel } from '../../../lib/posts';
import { useApp } from '../../../lib/store';
import { colors, radius, spacing } from '../../../lib/theme';

const shortDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

/** One level's page: its symbol, the day it ran, and everyone's posts. */
export default function Level() {
  const router = useRouter();
  const { n } = useLocalSearchParams<{ n: string }>();
  const level = Number(n);
  const {
    group,
    tasks,
    posts,
    hangoutPosts,
    task: currentTask,
    taskForLevel,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    taskLocked,
    hasPostedThisCycle,
    pending,
    remindToPost,
    loading,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'family' | 'hangout'>('family');

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;
  if (!Number.isInteger(level)) return <Redirect href="/(tabs)/path" />;

  const task = taskForLevel(level);
  // A re-issued level keeps its row but moves its start, so earlier posts stay
  // in the feed but don't belong to this round of the level.
  const levelPosts = withinLevel(posts, tasks, level).filter((p) => !isExtraPost(p, posts));
  // Everything shared while this level ran, task answers aside.
  const shares = withinLevel(
    [...hangoutPosts, ...posts.filter((p) => isExtraPost(p, posts))],
    tasks,
    level,
    posts
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Only the level being played is still live; the rest are a record.
  const open = currentTask.level === level && !taskLocked;
  const done = open && hasPostedThisCycle;
  // Hangout opens on the level being played once you've answered it; a level
  // already behind the family stays a record either way.
  const lockedHangout = tab === 'hangout' && open && !done;
  const shown = tab === 'family' ? levelPosts : lockedHangout ? [] : shares;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable
          // A level is only ever opened from the map, so back belongs there
          // rather than wherever the tab stack came from.
          onPress={() => router.replace('/(tabs)/path')}
          hitSlop={12}
          style={styles.backRow}
        >
          <Text style={styles.back}>←</Text>
          <Text style={styles.barTitle}>back</Text>
        </Pressable>
        <AvatarButton />
      </View>

      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{levelSymbol(level) ?? level}</Text>
              </View>
              <View>
                <Text style={styles.title}>Level {level}</Text>
                <Text style={styles.date}>{shortDate(task?.createdAt)}</Text>
              </View>
            </View>

            <Tabs active={tab} onSelect={setTab} />

            {task && tab === 'family' ? (
              <View style={styles.card}>
                <Text style={styles.prompt}>{task.prompt}</Text>
                {done ? <CompletedAnnouncement pending={pending} onRemind={remindToPost} /> : null}
              </View>
            ) : null}

            {open && !done && tab === 'family' ? (
              <View style={styles.answer}>
                {ANSWERS.map((a) => (
                  <Pressable
                    key={a.start}
                    style={styles.answerButton}
                    onPress={() => router.push(`/capture?start=${a.start}`)}
                  >
                    <Text style={styles.answerIcon}>{a.icon}</Text>
                    <Text style={styles.answerText}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'family'
              ? 'Nobody has posted for this level yet.'
              : lockedHangout
                ? '🔒 Locked! Answer the family task first, then hangout is all yours.'
                : 'Nothing else was shared during this level.'}
          </Text>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            prompt={tab === 'hangout' ? EXTRA_PROMPT : undefined}
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => toggleLike(item.id)}
            liked={likedByMe(item.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 96 }}
      />
    </View>
  );
}

const ANSWERS = [
  { start: 'photo', icon: '📷', label: 'photo' },
  { start: 'voice', icon: '🎙', label: 'voice' },
  { start: 'text', icon: '✎', label: 'write' },
] as const;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { fontSize: 22, color: colors.text },
  barTitle: { fontSize: 17, color: colors.text },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  badgeText: { fontSize: 28, color: colors.accent },
  title: { fontSize: 22, color: colors.text },
  date: { fontSize: 15, color: colors.muted },
  card: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  prompt: { fontSize: 16, color: colors.text },
  answer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  answerButton: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  answerIcon: { fontSize: 20 },
  answerText: { fontSize: 15, color: colors.text },
  empty: { margin: spacing.lg, color: colors.muted, textAlign: 'center' },
});
