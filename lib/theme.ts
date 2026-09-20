import { Platform } from 'react-native';

/** Wonderland palette — twilight purple, tea-party gold, cheshire teal. */
export const colors = {
  bg: '#FCF9EE',
  card: '#FFFFFF',
  text: '#2A1B3D',
  muted: '#7B6A93',
  accent: '#7E4BC4',
  accentSoft: '#EBE0FF',
  border: '#E4D9F5',
  success: '#2BB3A3',
  gold: '#E8B84B',
  night: '#241539',
  nightSoft: '#3A2459',
};

const handwriting = 'Schoolbell_400Regular';

/**
 * Loaded in app/_layout.tsx; the name must match the useFonts key. The web
 * build lists the emoji faces too, since a browser given a single family
 * leaves glyphs the handwriting face lacks — every emoji — blank.
 */
export const fonts = {
  body: Platform.select({
    web: `${handwriting}, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`,
    default: handwriting,
  }),
};

export const radius = { sm: 8, md: 14, lg: 22 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 24 };
