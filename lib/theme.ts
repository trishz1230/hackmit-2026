import { Platform } from 'react-native';

/** Sketchbook palette — cream paper, pencil ink, tea-party gold. */
export const colors = {
  bg: '#FAF6EC',
  card: '#FFFDF7',
  text: '#211E1A',
  muted: '#8B8272',
  accent: '#4A423A',
  accentSoft: '#F1EADB',
  border: '#EAE2D0',
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
