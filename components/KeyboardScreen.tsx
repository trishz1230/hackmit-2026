import React from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../lib/theme';

/** Form screens: keyboard insets only — no extra KeyboardAvoidingView lift. */
export function KeyboardScreen({
  children,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  // The home indicator's strip is added on top of whatever the screen asked
  // for, so a `padding` shorthand from the caller can't swallow it.
  const asked = StyleSheet.flatten(contentContainerStyle) ?? {};
  const bottom = asked.paddingBottom ?? asked.padding ?? spacing.md;
  return (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: (typeof bottom === 'number' ? bottom : spacing.md) + insets.bottom },
      ]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
