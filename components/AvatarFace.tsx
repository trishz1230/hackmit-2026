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

/**
 * Hair sits on top of the head outline. Each style is placed by its own width
 * (as a fraction of the face) and the amount it rises above the head, because
 * a bun is tall and a bob is wide.
 */
type Hair = { src: number; width: number; aspect: number; top: number };

export const HAIR: (Hair | null)[] = [
  null,
  { src: require('../assets/avatar/hair-curls.png'), width: 1.14, aspect: 549 / 700, top: -0.16 },
  { src: require('../assets/avatar/hair-short.png'), width: 1.06, aspect: 556 / 700, top: -0.13 },
  { src: require('../assets/avatar/hair-bob.png'), width: 1.08, aspect: 653 / 700, top: -0.13 },
  { src: require('../assets/avatar/hair-buzz.png'), width: 1.02, aspect: 501 / 700, top: -0.1 },
  { src: require('../assets/avatar/hair-braids.png'), width: 1.04, aspect: 700 / 462, top: -0.14 },
  { src: require('../assets/avatar/hair-afro.png'), width: 1.24, aspect: 545 / 700, top: -0.2 },
  { src: require('../assets/avatar/hair-bun.png'), width: 1.02, aspect: 700 / 591, top: -0.28 },
  { src: require('../assets/avatar/hair-long.png'), width: 1.0, aspect: 700 / 415, top: -0.12 },
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
      <Image source={HEAD} resizeMode="contain" style={[styles.layer, { width: size, height: size }]} />
      {hair ? (
        <Image
          source={hair.src}
          resizeMode="contain"
          style={[
            styles.layer,
            {
              top: size * hair.top,
              width: size * hair.width,
              height: size * hair.width * hair.aspect,
            },
          ]}
        />
      ) : null}
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
