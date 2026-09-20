import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Handwriting';
import { AvatarFace } from '../../components/AvatarFace';
import { AvatarButton } from '../../components/AvatarButton';
import { weekRange, weekStats } from '../../lib/week';
import { DEFAULT_LABELS, weekLabels, type StatLabels } from '../../lib/weekLabels';
import { familyContext } from '../../lib/prompts';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const greenStar = require('../../assets/doodles/green-star.png');
const yellowStar = require('../../assets/doodles/yellow-star.png');
const pinkHearts = require('../../assets/doodles/pink-hearts.png');

const dayMonth = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;

/** The first thing you see: how the family's week is going. */
export default function Home() {
  const router = useRouter();
  const { group, members, posts, hangoutPosts, reactions, memberById, loading } = useApp();
  const insets = useSafeAreaInsets();
  const [labels, setLabels] = useState<StatLabels>(DEFAULT_LABELS);

  const { start, end } = weekRange();
  const all = [...posts, ...hangoutPosts];
  const thisWeek = all.filter((p) => {
    const at = new Date(p.createdAt).getTime();
    return at >= start.getTime() && at <= end.getTime();
  });
  const stats = weekStats(thisWeek, reactions, members);

  // The week names its own categories once there is something to name them after.
  const groupId = group?.id;
  const weekKey = start.toDateString();
  const named = stats.length > 0;
  useEffect(() => {
    if (!groupId || !named) return;
    let live = true;
    weekLabels(groupId, start, familyContext(group?.name ?? '', members, thisWeek)).then((l) => {
      if (live) setLabels(l);
    });
    return () => {
      live = false;
    };
  }, [groupId, weekKey, named]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  return (
    <ScrollView style={[styles.wrap, { paddingTop: insets.top }]} contentContainerStyle={styles.body}>
      <View style={styles.header}>
        <View>
          <Image source={greenStar} style={styles.titleDoodle} resizeMode="contain" />
          <Text style={styles.title}>this week</Text>
          <Text style={styles.dates}>
            {dayMonth(start)}–{dayMonth(end)}
          </Text>
        </View>
        <AvatarButton size={54} />
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
        <View key={stat.metric}>
          <Image
            source={stat.metric === 'talked' ? yellowStar : pinkHearts}
            style={[styles.doodle, stat.metric === 'talked' ? styles.doodleRight : styles.doodleLeft]}
            resizeMode="contain"
          />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{labels[stat.metric]}</Text>
            <View style={styles.statWho}>
              <AvatarFace value={stat.member.avatar} size={28} />
              <Text style={styles.statName}>{stat.member.name}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const TILE = 96;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 44, lineHeight: 54, color: colors.text },
  titleDoodle: { position: 'absolute', top: -18, left: -14, width: 56, height: 56 },
  dates: { fontSize: 16, color: colors.text, marginTop: -6 },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 104,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 24,
  },
  statLabel: { flex: 1, fontSize: 21, lineHeight: 28, color: colors.text },
  statWho: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statName: { fontSize: 16, color: colors.muted },
  // Paint splashes sitting half off each card, as in the sketch.
  doodle: { position: 'absolute', width: 64, height: 64, zIndex: 1 },
  doodleRight: { right: -16, bottom: 4 },
  doodleLeft: { left: -12, bottom: -4 },
});
