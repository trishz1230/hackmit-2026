import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Handwriting';
import { PostCard } from '../../components/PostCard';
import { AvatarButton } from '../../components/AvatarButton';
import { dayDate, dayKey } from '../../lib/history';
import { useApp } from '../../lib/store';
import { colors, spacing } from '../../lib/theme';

const longDate = (key: string) =>
  dayDate(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

/** Everything the family put up on one day, kept for good. */
export default function HistoryDayScreen() {
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day: string }>();
  const {
    group,
    posts,
    hangoutPosts,
    promptFor,
    reactionsFor,
    memberById,
    toggleLike,
    likedByMe,
    loading,
  } = useApp();
  const insets = useSafeAreaInsets();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  const onThatDay = [...posts, ...hangoutPosts]
    .filter((p) => dayKey(p.createdAt) === day)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const prompt = onThatDay.map((p) => promptFor(p.taskId)).find(Boolean);

  return (
    <View style={styles.wrap}>
      <View style={[styles.titleRow, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{longDate(day)}</Text>
        <AvatarButton />
      </View>
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

      <FlatList
        data={onThatDay}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing was posted this day.</Text>}
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
        contentContainerStyle={{ paddingBottom: spacing.lg + insets.bottom }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: { flex: 1, fontSize: 20, color: colors.text },
  prompt: { color: colors.muted, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  empty: { margin: spacing.lg, color: colors.muted, textAlign: 'center' },
});
