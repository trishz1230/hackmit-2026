import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { AvatarButton } from '../../components/AvatarButton';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

/** The ＋ tab: post anything to the family, counting toward no level. */
export default function Plus() {
  const router = useRouter();
  const { group, hangoutPosts, reactionsFor, memberById, toggleLike, likedByMe, loading } = useApp();
  const insets = useSafeAreaInsets();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <FlatList
        data={hangoutPosts}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <AvatarButton />
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Hangout</Text>
              <Text style={styles.body}>
                Share whatever you want with {group.name}. Nothing here counts toward the level.
              </Text>
              <Pressable style={styles.cta} onPress={() => router.push('/capture?channel=hangout')}>
                <Text style={styles.ctaText}>Share something</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Nothing yet — be the first.</Text>}
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
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topBar: { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  header: {
    margin: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 0,
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { marginTop: spacing.xs, fontSize: 14, color: colors.muted, lineHeight: 20 },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.lg },
});
