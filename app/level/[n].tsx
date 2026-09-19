import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../components/Handwriting';
import { PostCard } from '../../components/PostCard';
import { levelSymbol } from '../../components/LevelMap';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const shortDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '';

/** One level's page: its symbol, the day it ran, and everyone's posts. */
export default function Level() {
  const router = useRouter();
  const { n } = useLocalSearchParams<{ n: string }>();
  const level = Number(n);
  const {
    group,
    tasks,
    posts,
    taskForLevel,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    taskLocked,
    loading,
  } = useApp();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;
  if (!Number.isInteger(level)) return <Redirect href="/(tabs)/path" />;

  const task = taskForLevel(level);
  const levelTaskIds = tasks.filter((t) => t.level === level).map((t) => t.id);
  const levelPosts = posts.filter((p) => levelTaskIds.includes(p.taskId));
  // The ＋ is only there while this level is the one the family is on.
  const live = level === Math.min(group.level, group.goal) && !taskLocked;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{levelSymbol(level) ?? level}</Text>
        </View>
        <View>
          <Text style={styles.title}>Level {level}</Text>
          <Text style={styles.date}>{shortDate(task?.createdAt)}</Text>
        </View>
      </View>

      {task ? <Text style={styles.prompt}>{task.prompt}</Text> : null}

      <FlatList
        data={levelPosts}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Nobody has posted for this level yet.</Text>}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            author={memberById(item.userId)}
            reactions={reactionsFor(item.id)}
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => toggleLike(item.id)}
            liked={likedByMe(item.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 96 }}
      />

      {live ? (
        <Pressable style={styles.fab} onPress={() => router.push('/capture')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
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
  prompt: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text,
  },
  empty: { margin: spacing.lg, color: colors.muted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
});
