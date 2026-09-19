import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { useApp } from '../../lib/store';
import { colors, spacing } from '../../lib/theme';

export default function Feed() {
  const router = useRouter();
  const { group, posts, me, reactionsFor, memberById, addReaction } = useApp();

  if (!group) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.sub}>Invite code: {group.joinCode}</Text>
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
            onPress={() => router.push(`/post/${item.id}`)}
            onLike={() => addReaction(item.id, 'like', me.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { marginTop: 2, fontSize: 13, color: colors.muted },
  empty: { margin: spacing.lg, color: colors.muted, textAlign: 'center' },
});
