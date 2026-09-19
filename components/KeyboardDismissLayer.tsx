import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { dismissKeyboard } from '../lib/keyboard';

function isWebField(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

/**
 * While a field is focused, a nearly-invisible layer sits on top of the screen
 * (not the OS keyboard). Any tap blurs the field and closes the keyboard.
 */
export function KeyboardDismissLayer({ armed }: { armed?: boolean }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [webField, setWebField] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onFocusIn = (e: FocusEvent) => {
      if (isWebField(e.target)) setWebField(true);
    };
    const onFocusOut = () => {
      requestAnimationFrame(() => setWebField(isWebField(document.activeElement)));
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (!(armed || keyboardOpen || webField)) return null;

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
