import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { LevelMap } from '../components/LevelMap';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Levels() {
  const { group } = useApp();
  const [selected, setSelected] = useState<number | null>(null);

  if (!group) return <Redirect href="/onboarding" />;

  const status =
    selected === null
      ? ''
      : selected < group.level
        ? 'Cleared — your family posted that day.'
        : selected === group.level
          ? "You're here. Everyone has to post to clear it."
          : 'Locked. Clear the levels before it first.';

  return (
    <View style={styles.fill}>
      <LevelMap
        level={group.level}
        goal={group.goal}
        reward={group.rewardText}
        onSelectLevel={setSelected}
      />

      <Modal visible={selected !== null} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Level {selected}</Text>
            <Text style={styles.sheetBody}>{status}</Text>
            <Pressable style={styles.close} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,10,35,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: 280,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sheetBody: { color: colors.muted, lineHeight: 20 },
  close: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontWeight: '700' },
});
