import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Text } from '../../components/Handwriting';
import { AvatarButton } from '../../components/AvatarButton';
import { HistoryGrid } from '../../components/HistoryGrid';
import { historyDays } from '../../lib/history';
import { useApp } from '../../lib/store';
import { colors, spacing } from '../../lib/theme';

/** Every day the family has posted, not just the handful the card fits. */
export default function HistoryAll() {
  const { group, posts, hangoutPosts, tasks, loading } = useApp();

  if (loading) return <View style={styles.wrap} />;
  if (!group) return <Redirect href="/onboarding" />;

  const history = historyDays([...posts, ...hangoutPosts], tasks);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.body}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Every day you showed up</Text>
        <AvatarButton />
      </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { flex: 1, fontSize: 20, color: colors.text },
  empty: { color: colors.muted },
});
