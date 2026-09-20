import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { dismissKeyboard } from '../lib/keyboard';

/**
 * While a field is focused, a nearly-invisible layer sits on top of the screen
 * (not the OS keyboard). Any tap blurs the field and closes the keyboard.
 *
 * A browser blurs a field on its own when you click elsewhere, and the layer
 * would swallow the wheel, so it is phones only.
 */
export function KeyboardDismissLayer({ armed }: { armed?: boolean }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS === 'web') return null;
  if (!(armed || keyboardOpen)) return null;

  return (
    <Pressable
      accessibilityLabel="Dismiss keyboard"
      collapsable={false}
      onPressIn={dismissKeyboard}
      style={styles.layer}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    // Transparent views often ignore taps; this still looks clear.
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
});
