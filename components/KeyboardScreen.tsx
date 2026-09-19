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
  return (
    <ScrollView
      style={styles.flex}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        { paddingBottom: spacing.md + insets.bottom },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
