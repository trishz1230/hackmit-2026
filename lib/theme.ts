import { Platform } from 'react-native';

/** The drawn-on-paper screens: welcome, start and the family forms. */
export const paper = {
  page: '#FAF8F0',
  ink: '#2A2A2A',
  muted: '#8A8275',
  button: '#FBE7BE',
  buttonOn: '#F2D294',
  field: '#FFFDF6',
  line: '#E6DFCD',
};

/** The same paper, named for the screens that were drawn on it first. */
export const colors = {
  bg: paper.page,
  card: paper.field,
  text: paper.ink,
  muted: paper.muted,
  accent: '#B07D2B',
  accentSoft: paper.button,
  border: paper.line,
  success: '#B07D2B',
  gold: paper.buttonOn,
  night: paper.page,
  nightSoft: '#F4ECD8',
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
