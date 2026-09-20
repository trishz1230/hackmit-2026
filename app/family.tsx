import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { AvatarFace } from '../components/AvatarFace';
import { useApp } from '../lib/store';
import { paper, radius, spacing } from '../lib/theme';

/** Shown straight after creating or joining: who is in the family so far. */
export default function FamilyAvatars() {
  const router = useRouter();
  const { group, members, me, loading } = useApp();

  if (loading) return <View style={styles.fill} />;
  if (!group) return <Redirect href="/onboarding" />;

  const alone = members.length <= 1;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.tagline}>
        {alone
          ? `Just you for now — share ${group.joinCode} and the rest will show up here.`
          : 'Everyone in the family so far.'}
      </Text>

      <View style={styles.grid}>
        {members.map((m) =>
          m.id === me.id ? (
            <Pressable key={m.id} style={styles.member} onPress={() => router.push('/avatar?edit=1')}>
              <AvatarFace value={m.avatar} size={96} />
              <Text style={styles.name}>{m.name} (you)</Text>
              <Text style={styles.edit}>edit avatar</Text>
            </Pressable>
          ) : (
            <View key={m.id} style={styles.member}>
              <AvatarFace value={m.avatar} size={96} />
              <Text style={styles.name}>{m.name}</Text>
            </View>
          )
        )}
      </View>

      <Pressable style={styles.cta} onPress={() => router.replace('/')}>
        <Text style={styles.ctaText}>Go to the map</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: paper.page },
  page: { backgroundColor: paper.page },
  wrap: {
    padding: spacing.lg,
    paddingTop: 72,
    gap: spacing.sm,
    backgroundColor: paper.page,
    flexGrow: 1,
  },
  title: { fontSize: 34, color: paper.ink },
  tagline: { fontSize: 16, color: paper.muted, lineHeight: 22, marginBottom: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  member: { alignItems: 'center', width: 110 },
  name: { marginTop: spacing.xs, fontSize: 17, color: paper.ink },
  edit: { fontSize: 15, color: paper.muted, textDecorationLine: 'underline' },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: paper.button,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: paper.ink, fontSize: 19 },
});
