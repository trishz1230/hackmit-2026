import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { colors, radius, spacing } from '../lib/theme';
import type { Profile } from '../lib/types';

/** After you post: name who still owes a post, or celebrate that everyone has. */
export function CompletedAnnouncement({
  pending,
  onRemind,
}: {
  pending: Profile[];
  onRemind: (memberId: string) => void;
}) {
  const [sent, setSent] = useState<string[]>([]);

  if (pending.length === 0) {
    return <Text style={styles.complete}>✓ Complete · Everyone posted</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.complete}>✓ Complete</Text>
      <Text style={styles.waiting}>Still waiting on</Text>
      {pending.map((m) => {
        const reminded = sent.includes(m.id);
        return (
          <View key={m.id} style={styles.row}>
            <Text style={styles.name}>
              {m.avatar} {m.name}
            </Text>
            <Pressable
              style={[styles.remind, reminded && styles.reminded]}
              disabled={reminded}
              onPress={() => {
                onRemind(m.id);
                setSent((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]));
              }}
            >
              <Text style={[styles.remindText, reminded && styles.remindedText]}>
                {reminded ? 'Sent' : 'Remind'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, gap: spacing.xs },
  complete: { color: colors.success, fontWeight: '800' },
  waiting: { color: colors.muted, fontWeight: '600', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontWeight: '600' },
  remind: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  reminded: { backgroundColor: colors.accentSoft },
  remindText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  remindedText: { color: colors.accent },
});
