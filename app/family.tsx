import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { AvatarFace } from '../components/AvatarFace';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

/** Shown straight after creating or joining: who is in the family so far. */
export default function FamilyAvatars() {
  const router = useRouter();
  const { group, members, me, loading } = useApp();

  if (loading) return <View style={styles.fill} />;
  if (!group) return <Redirect href="/onboarding" />;

  const alone = members.length <= 1;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
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
  fill: { flex: 1, backgroundColor: colors.night },
  wrap: { padding: spacing.lg, paddingTop: 72, gap: spacing.sm },
  title: { fontSize: 30, fontWeight: '800', color: colors.accent },
  tagline: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  member: { alignItems: 'center', width: 110 },
  name: { marginTop: spacing.xs, fontSize: 16, color: colors.text },
  edit: { fontSize: 14, color: colors.accent, textDecorationLine: 'underline' },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
