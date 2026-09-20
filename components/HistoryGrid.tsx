import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { useRouter } from 'expo-router';
import { dayDate, type HistoryDay } from '../lib/history';
import { colors, radius, spacing } from '../lib/theme';

/** Tiles the card has room for before the last one becomes "expand". */
const SHOWN = 5;

/**
 * The days the family posted, as date tiles. Past `SHOWN` days the card keeps
 * the most recent four and hands the rest to the history page.
 */
export function HistoryGrid({ days, all = false }: { days: HistoryDay[]; all?: boolean }) {
  const router = useRouter();
  const overflowing = !all && days.length > SHOWN;
  const shown = overflowing ? days.slice(0, SHOWN - 1) : days;

  return (
    <View style={styles.grid}>
      {shown.map((day) => {
        const date = dayDate(day.key);
        return (
          <Pressable
            key={day.key}
            style={styles.day}
            onPress={() => router.push(`/history/${day.key}`)}
          >
            <Text style={styles.month}>
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </Text>
            <Text style={styles.number}>{date.getDate()}</Text>
            <Text style={styles.year}>{date.getFullYear()}</Text>
          </Pressable>
        );
      })}
      {overflowing ? (
        <Pressable style={[styles.day, styles.expand]} onPress={() => router.push('/history')}>
          <Text style={styles.expandText}>expand</Text>
          <Text style={styles.year}>+{days.length - shown.length}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: {
    width: 64,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  month: { fontSize: 13, color: colors.accent, textTransform: 'uppercase' },
  number: { fontSize: 22, color: colors.text },
  year: { fontSize: 12, color: colors.muted },
  expand: { backgroundColor: colors.card },
  expandText: { fontSize: 15, color: colors.accent },
});
