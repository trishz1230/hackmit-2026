import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { useRouter } from 'expo-router';
import { paper, spacing } from '../lib/theme';

const TABS = [
  { key: 'family', label: 'family task', href: '/(tabs)/feed' },
  { key: 'hangout', label: 'hangout', href: '/(tabs)/hangout' },
] as const;

/** Switches between the level feed and the anything-goes feed. */
export function Tabs({ active }: { active: 'family' | 'hangout' }) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => router.replace(tab.href)}
          style={[styles.tab, active === tab.key && styles.tabActive]}
        >
          <Text style={[styles.text, active === tab.key && styles.textActive]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: paper.field,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: paper.line,
    padding: 4,
    margin: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: paper.button },
  text: { color: paper.muted, fontSize: 17 },
  textActive: { color: paper.ink },
});
