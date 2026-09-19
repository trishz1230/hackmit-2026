import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../lib/theme';

const TABS = [
  { key: 'family', label: 'Family task', href: '/' },
  { key: 'hangout', label: 'Hangout', href: '/hangout' },
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
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 4,
    margin: spacing.md,
    marginBottom: 0,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  text: { color: colors.muted, fontWeight: '600' },
  textActive: { color: colors.text },
});
