import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Handwriting';
import { AvatarFace } from '../../components/AvatarFace';
import { AvatarButton } from '../../components/AvatarButton';
import { PostStack } from '../../components/PostStack';
import { GreenStar, HeartsDoodle, PhoneDoodle, YellowStar } from '../../components/Doodles';
import { weekRange, weekStats } from '../../lib/week';
import { DEFAULT_LABELS, weekLabels, type StatLabels } from '../../lib/weekLabels';
import { describeMedia } from '../../lib/describe';
import { familyContext } from '../../lib/prompts';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';

const dayMonth = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;

/** The first thing you see: how the family's week is going. */
export default function Home() {
  const router = useRouter();
  const { group, members, posts, hangoutPosts, reactions, memberById, loading } = useApp();
  const insets = useSafeAreaInsets();
  const [labels, setLabels] = useState<StatLabels>(DEFAULT_LABELS);
  const { height: screenHeight } = useWindowDimensions();
  // Wakes the screen once the week rolls over, so the dates and the photo pile
  // restart even if the app stays open through Sunday night.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setTimeout(
      () => setNow(new Date()),
      Math.max(1, weekRange().end.getTime() - Date.now()) + 1000
    );
    return () => clearTimeout(id);
  }, [now]);

  const { start, end } = weekRange(now);
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
    describeMedia(thisWeek)
      .then((described) =>
        weekLabels(groupId, start, familyContext(group?.name ?? '', members, thisWeek, described)),
      )
      .then((l) => {
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
          <GreenStar size={58} style={styles.starTitle} />
          <Text style={styles.title}>this week</Text>
          <Text style={styles.dates}>
            {dayMonth(start)}–{dayMonth(end)}
          </Text>
        </View>
        <AvatarButton />
      </View>

      {thisWeek.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.empty}>nothing shared yet... :(</Text>
          <PhoneDoodle size={28} style={styles.emptyPhone} />
        </View>
      ) : (
        <View
          style={{
            // The pile starts about a quarter of the way down the screen.
            marginTop: Math.max(spacing.sm, screenHeight * 0.25 - insets.top - 109),
          }}
        >
          <PostStack
            key={start.getTime()}
            posts={thisWeek}
            nameOf={(id) => memberById(id)?.name ?? 'Someone'}
            onOpen={(post) => router.push(`/post/${post.id}`)}
          />
        </View>
      )}

      {[
        {
          label: labels.quiet,
          member: stats.find((s) => s.metric === 'quiet')?.member,
        },
        {
          label: labels.talked,
          member: stats.find((s) => s.metric === 'talked')?.member,
        },
      ].map((box, i) => (
        <View key={box.label} style={styles.statWrap}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{box.label}</Text>
            {box.member && (
              <View style={styles.statWho}>
                <AvatarFace value={box.member.avatar} size={28} />
                <Text style={styles.statName}>{box.member.name}</Text>
              </View>
            )}
          </View>
          {i === 0 && <YellowStar size={54} style={styles.starBox} />}
          {i === 1 && <HeartsDoodle size={54} style={styles.heartsBox} />}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.md, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 34, color: colors.text },
  dates: { fontSize: 15, color: colors.muted },
  empty: { fontSize: 18, color: colors.text },
  emptyCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    minHeight: 140,
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: radius.md,
  },
  // The receiver dangles into the card from above, cord and all.
  emptyPhone: { position: 'absolute', right: 34, top: -58 },
  starTitle: { position: 'absolute', left: -20, top: -24 },
  statWrap: { marginBottom: spacing.sm },
  stat: {
    padding: spacing.md,
    minHeight: 92,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  starBox: { position: 'absolute', right: -12, top: '35%' },
  heartsBox: { position: 'absolute', left: 22, bottom: -12 },
  statLabel: { fontSize: 18, color: colors.text },
  statWho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statName: { fontSize: 16, color: colors.accent },
});
