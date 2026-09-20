import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { colors } from '../lib/theme';

const icons: Record<string, number> = {
  index: require('../assets/tabs/home.png'),
  path: require('../assets/tabs/path.png'),
};

/**
 * The drawn bar: home and path share one rounded card, the plus sits apart in
 * its own circle. Placeholder line art until the family's own icons land.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const go = (index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };

  const shown = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => route.name === 'index' || route.name === 'path');
  const plus = state.routes.findIndex((r) => r.name === 'plus');

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.pill}>
        {shown.map(({ route, index }) => (
          <Pressable
            key={route.key}
            onPress={() => go(index)}
            style={[styles.slot, state.index === index && styles.slotOn]}
          >
            <Image source={icons[route.name]} style={styles.icon} resizeMode="contain" />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => go(plus)} style={styles.plus}>
        <View style={styles.plusMark}>
          <View style={styles.plusBar} />
          <View style={[styles.plusBar, styles.plusBarUp]} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: colors.bg,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  slot: {
    width: 56,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: { backgroundColor: colors.accentSoft },
  icon: { width: 34, height: 34 },
  plus: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusMark: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  plusBar: { position: 'absolute', width: 26, height: 4, borderRadius: 2, backgroundColor: colors.text },
  plusBarUp: { width: 4, height: 26 },
});
