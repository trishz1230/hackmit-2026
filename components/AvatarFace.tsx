import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';

/**
 * Hand-drawn avatar built from three swappable layers. A profile stores it in
 * the same `avatar` column as the old emoji, encoded as "face:eyes,mouth,hair";
 * anything else is still rendered as an emoji.
 */
export const EYES = [
  require('../assets/avatar/eyes-dots.png'),
  require('../assets/avatar/eyes-hearts.png'),
  require('../assets/avatar/eyes-squiggle.png'),
  require('../assets/avatar/eyes-diamonds.png'),
  require('../assets/avatar/eyes-tears.png'),
];

export const MOUTHS = [
  require('../assets/avatar/mouth-smile.png'),
  require('../assets/avatar/mouth-grin.png'),
  require('../assets/avatar/mouth-oh.png'),
  require('../assets/avatar/mouth-squiggle.png'),
  require('../assets/avatar/mouth-blob.png'),
  require('../assets/avatar/mouth-teeth.png'),
];

/** Hair variants are drawn with their own head outline, so they replace it. */
export const HAIR: (number | null)[] = [
  null,
  require('../assets/avatar/hair-curls.png'),
  require('../assets/avatar/hair-short.png'),
  require('../assets/avatar/hair-bob.png'),
  require('../assets/avatar/hair-buzz.png'),
  require('../assets/avatar/hair-braids.png'),
  require('../assets/avatar/hair-afro.png'),
];

export const HEAD = require('../assets/avatar/head.png');

export type Face = { eyes: number; mouth: number; hair: number };

export const FACE_PREFIX = 'face:';

export function encodeFace(f: Face) {
  return `${FACE_PREFIX}${f.eyes},${f.mouth},${f.hair}`;
}

export function parseFace(value?: string): Face | null {
  if (!value || !value.startsWith(FACE_PREFIX)) return null;
  const [eyes, mouth, hair] = value.slice(FACE_PREFIX.length).split(',').map(Number);
  if ([eyes, mouth, hair].some((n) => !Number.isInteger(n))) return null;
  return {
    eyes: eyes % EYES.length,
    mouth: mouth % MOUTHS.length,
    hair: hair % HAIR.length,
  };
}

/** Renders a drawn avatar, or the emoji fallback for profiles made before this. */
export function AvatarFace({ value, size }: { value?: string; size: number }) {
  const face = parseFace(value);
  if (!face) return <Text style={{ fontSize: size * 0.8 }}>{value || '🙂'}</Text>;
  return <FaceLayers face={face} size={size} />;
}

/** `upTo` hides later features while the avatar is still being built. */
export function FaceLayers({
  face,
  size,
  upTo = 'hair',
}: {
  face: Face;
  size: number;
  upTo?: 'eyes' | 'mouth' | 'hair';
}) {
  const hair = upTo === 'hair' ? HAIR[face.hair] : null;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={hair ?? HEAD}
        resizeMode="contain"
        style={[styles.layer, { width: size, height: size }]}
      />
      <Image
        source={EYES[face.eyes]}
        resizeMode="contain"
        style={[styles.layer, { top: size * 0.36, width: size * 0.46, height: size * 0.14 }]}
      />
      {upTo === 'eyes' ? null : (
        <Image
          source={MOUTHS[face.mouth]}
          resizeMode="contain"
          style={[styles.layer, { top: size * 0.56, width: size * 0.34, height: size * 0.18 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
});
