import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/Handwriting';
import { AvatarButton } from '../../components/AvatarButton';
import { HistoryGrid } from '../../components/HistoryGrid';
import { historyDays } from '../../lib/history';
import { useApp } from '../../lib/store';
import { colors, spacing } from '../../lib/theme';

/** Every day the family has posted, not just the handful the card fits. */
export default function HistoryAll() {
  const { group, posts, hangoutPosts, tasks, loading } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  const history = historyDays([...posts, ...hangoutPosts], tasks);

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={[
        styles.body,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.md + insets.bottom },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>← back</Text>
        </Pressable>
        <AvatarButton />
      </View>
      <Text style={styles.title}>Every day you showed up</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>Nothing saved yet.</Text>
      ) : (
        <HistoryGrid days={history} all />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.md, gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  back: { fontSize: 17, color: colors.muted },
  title: { fontSize: 20, color: colors.text },
  empty: { color: colors.muted },
});
