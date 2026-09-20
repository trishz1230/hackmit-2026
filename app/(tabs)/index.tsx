import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Text } from '../../components/Handwriting';
import { AvatarFace } from '../../components/AvatarFace';
import { weekRange, weekStats } from '../../lib/week';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const dayMonth = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;

/** The first thing you see: how the family's week is going. */
export default function Home() {
  const router = useRouter();
  const { group, members, me, posts, hangoutPosts, reactions, memberById, loading } = useApp();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  const { start, end } = weekRange();
  const all = [...posts, ...hangoutPosts];
  const thisWeek = all.filter((p) => {
    const at = new Date(p.createdAt).getTime();
    return at >= start.getTime() && at <= end.getTime();
  });
  const stats = weekStats(thisWeek, reactions, members);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.body}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>This week</Text>
          <Text style={styles.dates}>
            {dayMonth(start)}–{dayMonth(end)}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/family')} hitSlop={8}>
          <AvatarFace value={me.avatar} size={42} />
        </Pressable>
      </View>

      <View style={styles.collage}>
        {thisWeek.length === 0 ? (
          <Text style={styles.empty}>Nothing from the family yet this week.</Text>
        ) : (
          thisWeek.map((post, i) => (
            <Pressable
              key={post.id}
              onPress={() => router.push(`/post/${post.id}`)}
              style={[styles.tile, { transform: [{ rotate: `${(i % 2 ? 1 : -1) * 3}deg` }] }]}
            >
              {post.kind === 'photo' ? (
                <Image source={{ uri: post.content }} style={styles.tileArt} resizeMode="cover" />
              ) : (
                <Text style={styles.tileText} numberOfLines={4}>
                  {post.kind === 'voice' ? `🎙 ${post.caption || 'Voice message'}` : post.content}
                </Text>
              )}
              <Text style={styles.tileName}>{memberById(post.userId)?.name ?? 'Someone'}</Text>
            </Pressable>
          ))
        )}
      </View>

      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text style={styles.statLabel}>{stat.label}</Text>
          <View style={styles.statWho}>
            <AvatarFace value={stat.member.avatar} size={28} />
            <Text style={styles.statName}>{stat.member.name}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const TILE = 96;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.md, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, color: colors.text },
  dates: { fontSize: 15, color: colors.muted },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  tile: {
    width: TILE,
    height: TILE + 18,
    padding: 4,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileArt: { flex: 1, borderRadius: 4 },
  tileText: { flex: 1, fontSize: 13, color: colors.text },
  tileName: { fontSize: 12, color: colors.muted },
  empty: { color: colors.muted },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { fontSize: 15, color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  statWho: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statName: { fontSize: 16, color: colors.accent },
});
