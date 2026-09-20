import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HouseIcon, PlusIcon, RoadIcon } from './Doodles';
import { useApp } from '../lib/store';
import { colors, spacing } from '../lib/theme';

/**
 * The floating bottom bar: a pill holding Home and Journey, and a separate
 * round ＋ that drops you on the current level. Settings lives on the profile
 * avatar instead.
 */
type NavBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

export function NavBar({ state, navigation }: NavBarProps) {
  const router = useRouter();
  const { group } = useApp();
  const insets = useSafeAreaInsets();
  const level = group ? Math.min(group.level, group.goal) : 1;
  const active = state.routes[state.index]?.name;

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        <Pressable
          style={styles.section}
          onPress={() => navigation.navigate('index')}
          hitSlop={6}
        >
          <HouseIcon size={30} dim={active !== 'index'} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.section}
          onPress={() => navigation.navigate('path')}
          hitSlop={6}
        >
          <RoadIcon size={30} dim={active !== 'path'} />
        </Pressable>
      </View>
      <View style={styles.spacer} />
      <Pressable style={styles.plus} onPress={() => router.push(`/level/${level}`)}>
        <PlusIcon size={56} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  section: { paddingHorizontal: 18, paddingVertical: 2 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  spacer: { flex: 1 },
  plus: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
