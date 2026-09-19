import { Keyboard, Platform, TextInput } from 'react-native';

/** Hide the software keyboard and drop focus so it does not bounce back. */
export function dismissKeyboard() {
  const focused = TextInput.State.currentlyFocusedInput?.();
  focused?.blur();
  Keyboard.dismiss();
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
      el.blur();
    }
  }
}
